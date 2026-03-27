"""FastAPI server for operator-agent NL2SQL endpoints."""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from ..operator_agent import OperatorAgent, OperatorAgentFactory
from ..config import load_operator_config
from .auth import verify_api_key, get_allowed_origins

app = FastAPI(title="Operator Agent API", version="1.0.0")

# CORS configuration - use specific origins instead of "*"
ALLOWED_ORIGINS = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Configuration
NL2SQL_SERVICE_URL = os.getenv("NL2SQL_SERVICE_URL", "http://localhost:8081")

# Global agent instance
_agent: Optional[OperatorAgent] = None


class IndicatorQuery(BaseModel):
    operatorName: Optional[str] = None
    limit: Optional[int] = 100


class CompareQuery(BaseModel):
    operatorName: str
    currentMonth: str
    compareMonth: str
    siteCode: Optional[str] = None


class TrendQuery(BaseModel):
    operatorName: str
    startTime: str
    endTime: str
    cellId: Optional[str] = None
    siteCode: Optional[str] = None
    limit: Optional[int] = 1000


class TimesQuery(BaseModel):
    operatorName: Optional[str] = None
    siteCode: Optional[str] = None


class AgentRunRequest(BaseModel):
    input: str
    stream: bool = False
    confirmed: bool = False


class SiteCellsQuery(BaseModel):
    operatorId: Optional[int] = None
    band: Optional[str] = None


async def get_agent() -> OperatorAgent:
    """Get or create the agent instance."""
    global _agent
    if _agent is None:
        config_dir = os.getenv("AGENT_CONFIG_DIR")
        operator_config = load_operator_config(config_dir)

        from agent_framework.core import AgentConfig
        config = AgentConfig(
            name="OperatorAgent",
            description="Operator Agent with NL2SQL capabilities",
            model_name="claude-3-sonnet-20240229",
        )

        _agent = await OperatorAgentFactory.create_from_config(config, config_dir)

        # Register NL2SQL service if configured
        java_services = operator_config.get_java_services()
        for svc in java_services:
            if svc["name"] == "nl2sql-service":
                await _agent.add_java_service(
                    service_name=svc["name"],
                    base_url=svc["base_url"],
                    api_prefix=svc["api_prefix"],
                )

    return _agent


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "operator-agent"}


@app.get("/api/capabilities")
async def get_capabilities(_: bool = Depends(verify_api_key)):
    """Get agent capabilities."""
    agent = await get_agent()
    return agent.get_capabilities_summary()


@app.post("/api/operator/indicators/latest")
async def get_latest_indicators(query: IndicatorQuery, _: bool = Depends(verify_api_key)):
    """Get latest indicator data from NL2SQL service."""
    agent = await get_agent()

    params = {"limit": query.limit or 100}
    if query.operatorName:
        params["operatorName"] = query.operatorName

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/indicators/latest",
        method="GET",
        query_params=params,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/api/operator/indicators/compare")
async def compare_indicators(query: CompareQuery, _: bool = Depends(verify_api_key)):
    """Compare indicators between two months."""
    agent = await get_agent()

    params = {
        "operatorName": query.operatorName,
        "currentMonth": query.currentMonth,
        "compareMonth": query.compareMonth,
    }
    if query.siteCode:
        params["siteCode"] = query.siteCode

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/indicators/compare",
        method="GET",
        query_params=params,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/api/operator/indicators/trend")
async def get_indicator_trend(query: TrendQuery, _: bool = Depends(verify_api_key)):
    """Get indicator trend data."""
    agent = await get_agent()

    params = {
        "operatorName": query.operatorName,
        "startTime": query.startTime,
        "endTime": query.endTime,
        "limit": query.limit or 1000,
    }
    if query.cellId:
        params["cellId"] = query.cellId
    if query.siteCode:
        params["siteCode"] = query.siteCode

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/indicators/trend",
        method="GET",
        query_params=params,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/api/operator/times")
async def get_available_times(query: TimesQuery, _: bool = Depends(verify_api_key)):
    """Get available time points in the database."""
    agent = await get_agent()

    params = {}
    if query.operatorName:
        params["operatorName"] = query.operatorName
    if query.siteCode:
        params["siteCode"] = query.siteCode

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/times",
        method="GET",
        query_params=params,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/api/operator/nl2sql/query")
async def nl2sql_query(request: Dict[str, Any], _: bool = Depends(verify_api_key)):
    """Execute natural language query via NL2SQL."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/query",
        method="POST",
        body=request,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/api/operator/site-cells")
async def get_site_cells(query: SiteCellsQuery, _: bool = Depends(verify_api_key)):
    """Get site cell summary data."""
    agent = await get_agent()

    params = {}
    if query.operatorId:
        params["operatorId"] = query.operatorId
    if query.band:
        params["band"] = query.band

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/site-summary",
        method="GET",
        query_params=params,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


def format_site_data(site_cells: list, operators: list, latest_only: bool = False) -> str:
    """Format site cell data into markdown table format."""
    if not site_cells:
        return "未找到站点数据"

    lines = ["# 运营商站点信息\n"]

    # Get operator names
    operator_map = {}
    for op in operators:
        if isinstance(op, dict):
            operator_map[op.get("id")] = op.get("operatorName", "Unknown")

    # Group by operator
    operator_ids = set()
    for sc in site_cells:
        if isinstance(sc, dict) and "operatorId" in sc:
            operator_ids.add(sc["operatorId"])

    for op_id in sorted(operator_ids):
        op_name = operator_map.get(op_id, f"运营商{op_id}")
        lines.append(f"\n## {op_name}\n")

        # Filter site cells for this operator
        op_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("operatorId") == op_id]

        if not op_cells:
            continue

        # For each month data
        for cell in op_cells:
            data_month = cell.get("dataMonth", "")
            if latest_only:
                lines.append(f"\n### 数据月份: {data_month}\n")
            else:
                lines.append(f"\n### 数据月份: {data_month}\n")

            # LTE bands
            lines.append("**LTE 频段:**\n")
            lte_bands = [
                ("700M", cell.get("lte700MSite", 0), cell.get("lte700MCell", 0)),
                ("800M", cell.get("lte800MSite", 0), cell.get("lte800MCell", 0)),
                ("900M", cell.get("lte900MSite", 0), cell.get("lte900MCell", 0)),
                ("1400M", cell.get("lte1400MSite", 0), cell.get("lte1400MCell", 0)),
                ("1800M", cell.get("lte1800MSite", 0), cell.get("lte1800MCell", 0)),
                ("2100M", cell.get("lte2100MSite", 0), cell.get("lte2100MCell", 0)),
                ("2600M", cell.get("lte2600MSite", 0), cell.get("lte2600MCell", 0)),
            ]
            for band, sites, cells in lte_bands:
                if sites or cells:
                    lines.append(f"- LTE {band}: {sites} 站点, {cells} 小区")
            lines.append(f"- **LTE 合计**: {cell.get('lteTotalSite', 0)} 站点, {cell.get('lteTotalCell', 0)} 小区")

            # NR bands
            lines.append("\n**NR 频段:**\n")
            nr_bands = [
                ("700M", cell.get("nr700MSite", 0), cell.get("nr700MCell", 0)),
                ("800M", cell.get("nr800MSite", 0), cell.get("nr800MCell", 0)),
                ("900M", cell.get("nr900MSite", 0), cell.get("nr900MCell", 0)),
                ("1400M", cell.get("nr1400MSite", 0), cell.get("nr1400MCell", 0)),
                ("1800M", cell.get("nr1800MSite", 0), cell.get("nr1800MCell", 0)),
                ("2100M", cell.get("nr2100MSite", 0), cell.get("nr2100MCell", 0)),
                ("2600M", cell.get("nr2600MSite", 0), cell.get("nr2600MCell", 0)),
                ("3500M", cell.get("nr3500MSite", 0), cell.get("nr3500MCell", 0)),
                ("4900M", cell.get("nr4900MSite", 0), cell.get("nr4900MCell", 0)),
                ("2300M", cell.get("nr2300MSite", 0), cell.get("nr2300MCell", 0)),
            ]
            for band, sites, cells in nr_bands:
                if sites or cells:
                    lines.append(f"- NR {band}: {sites} 站点, {cells} 小区")
            lines.append(f"- **NR 合计**: {cell.get('nrTotalSite', 0)} 站点, {cell.get('nrTotalCell', 0)} 小区")

    return "\n".join(lines)


@app.post("/api/agent/run")
async def agent_run(request: AgentRunRequest, _: bool = Depends(verify_api_key)):
    """
    Run the agent with user input (synchronous JSON response).
    """
    result = await _process_agent_request(request.input, request.confirmed)
    return result


@app.post("/api/agent/stream")
async def agent_stream(request: AgentRunRequest, _: bool = Depends(verify_api_key)):
    """
    Run the agent with user input (SSE streaming response).
    """
    from fastapi.responses import StreamingResponse

    async def generate():
        try:
            # Send start marker
            yield "data: {\"type\": \"start\"}\n\n"

            # Process request
            result = await _process_agent_request(request.input, request.confirmed)

            # Send result as SSE
            if "error" in result:
                yield f"data: {{\"type\": \"error\", \"content\": {json.dumps(result['error'])}}}\n\n"
            elif "content" in result:
                # Stream content word by word for better UX
                content = result["content"]
                for i in range(0, len(content), 50):
                    chunk = content[i:i+50]
                    yield f"data: {{\"type\": \"content\", \"content\": {json.dumps(chunk)}}}\n\n"
                    await asyncio.sleep(0.01)  # Small delay for streaming effect
            else:
                yield f"data: {{\"type\": \"content\", \"content\": {json.dumps(str(result))}}}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {{\"type\": \"error\", \"content\": {json.dumps(str(e))}}}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


async def _process_agent_request(user_input: str, confirmed: bool = False) -> Dict[str, Any]:
    """
    Shared logic for processing agent requests.
    """
    import asyncio
    import json

    agent = await get_agent()

    try:
        # Use LLM to analyze the query intent
        intent_result = await agent.process_natural_language_query(user_input)

        if "error" in intent_result:
            return {"content": f"Intent detection failed: {intent_result['error']}"}

        intent = intent_result.get("intent", "unknown")
        operator_name = intent_result.get("operator_name")
        data_month = intent_result.get("data_month")
        limit = intent_result.get("limit", 50)

        # Get operators for name resolution
        operators_result = await agent.call_java_service(
            service_name="nl2sql-service",
            endpoint="/operators",
            method="GET",
        )
        operators = []
        if not isinstance(operators_result, dict) or "error" not in operators_result:
            operators = operators_result.get("data") if isinstance(operators_result, dict) else operators_result
            operators = operators if isinstance(operators, list) else []

        # Route based on LLM-detected intent
        if intent == "site_data":
            site_cells_result = await agent.get_site_cells()
            if "error" in site_cells_result:
                return {"content": f"获取站点数据失败: {site_cells_result['error']}"}

            site_cells = site_cells_result.get("data") if isinstance(site_cells_result, dict) else site_cells_result
            site_cells = site_cells if isinstance(site_cells, list) else []

            # Filter by operator if specified
            if operator_name:
                op_id = None
                for op in operators:
                    if isinstance(op, dict):
                        op_name = op.get("operatorName", "")
                        if op_name == operator_name or operator_name in op_name or op_name in operator_name:
                            op_id = op.get("id")
                            break
                if op_id:
                    site_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("operatorId") == op_id]

            if data_month:
                site_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("dataMonth") == data_month]

            return {"content": format_site_data(site_cells, operators, latest_only=False)}

        elif intent == "latest_data":
            site_cells_result = await agent.get_site_cells()
            if "error" in site_cells_result:
                return {"content": f"获取站点数据失败: {site_cells_result['error']}"}

            site_cells = site_cells_result.get("data") if isinstance(site_cells_result, dict) else site_cells_result
            site_cells = site_cells if isinstance(site_cells, list) else []

            if operator_name:
                op_id = None
                for op in operators:
                    if isinstance(op, dict):
                        op_name = op.get("operatorName", "")
                        if op_name == operator_name or operator_name in op_name or op_name in operator_name:
                            op_id = op.get("id")
                            break
                if op_id:
                    site_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("operatorId") == op_id]

            latest_month = None
            for sc in site_cells:
                if isinstance(sc, dict) and sc.get("dataMonth"):
                    month = sc.get("dataMonth")
                    if latest_month is None or month > latest_month:
                        latest_month = month

            if latest_month:
                site_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("dataMonth") == latest_month]

            lines = [f"# 运营商最新数据 (数据月份: {latest_month})\n"]
            lines.append(format_site_data(site_cells, operators, latest_only=True).split("\n", 1)[1] if len(format_site_data(site_cells, operators, latest_only=True).split("\n", 1)) > 1 else "")
            return {"content": "\n".join(lines) if lines[-1] else format_site_data(site_cells, operators, latest_only=True)}

        elif intent == "indicator_data":
            result = await agent.get_latest_indicators(limit=limit)
            if "error" in result:
                return {"content": f"获取指标数据失败: {result['error']}"}

            data = result.get("data", result) if isinstance(result, dict) else result
            if not data:
                return {"content": "未找到指标数据"}

            lines = ["# 运营商指标数据\n"]
            for item in data[:limit] if isinstance(data, list) else [data]:
                if isinstance(item, dict):
                    lines.append(f"- **{item.get('dataMonth', 'N/A')}** | LTE下行: {item.get('lteAvgDlRate', 'N/A')} Mbps | NR下行: {item.get('nrAvgDlRate', 'N/A')} Mbps | 分流比: {item.get('splitRatio', 'N/A')}%")

            return {"content": "\n".join(lines)}

        elif intent == "operator_list":
            result = await agent.call_java_service(
                service_name="nl2sql-service",
                endpoint="/operators",
                method="GET",
            )
            if "error" in result:
                return {"content": f"获取运营商列表失败: {result['error']}"}

            operators = result.get("data") if isinstance(result, dict) else result
            operators = operators if isinstance(operators, list) else []

            if not operators:
                return {"content": "未找到运营商数据"}

            lines = ["# 运营商列表\n"]
            for op in operators:
                if isinstance(op, dict):
                    name = op.get("operatorName", "Unknown")
                    country = op.get("country", "")
                    region = op.get("region", "")
                    network = op.get("networkType", "")
                    lines.append(f"- **{name}** | {country} | {region} | {network}")

            return {"content": "\n".join(lines)}

        elif intent == "nl2sql":
            result = await agent.query_nl2sql(natural_language_query=user_input)
            if "error" in result:
                return {"content": f"查询失败: {result['error']}"}

            data = result.get("data", []) if isinstance(result, dict) else result
            if not data:
                return {"content": "未找到相关数据"}

            lines = [f"# 查询结果\n\n共找到 {len(data) if isinstance(data, list) else 1} 条记录\n"]
            if isinstance(data, list) and len(data) > 0:
                keys = list(data[0].keys()) if isinstance(data[0], dict) else []
                lines.append("| " + " | ".join(str(k) for k in keys) + " |")
                lines.append("| " + " | ".join(["---"] * len(keys)) + " |")
                for row in data[:limit]:
                    if isinstance(row, dict):
                        lines.append("| " + " | ".join(str(row.get(k, "")) for k in keys) + " |")

            return {"content": "\n".join(lines)}

        else:
            # Fallback to NL2SQL
            result = await agent.query_nl2sql(natural_language_query=user_input)
            if "error" in result:
                return {"content": f"查询失败: {result['error']}"}

            data = result.get("data", []) if isinstance(result, dict) else result
            if not data:
                return {"content": "未找到相关数据"}

            lines = [f"# 查询结果\n\n共找到 {len(data) if isinstance(data, list) else 1} 条记录\n"]
            if isinstance(data, list) and len(data) > 0:
                keys = list(data[0].keys()) if isinstance(data[0], dict) else []
                lines.append("| " + " | ".join(str(k) for k in keys) + " |")
                lines.append("| " + " | ".join(["---"] * len(keys)) + " |")
                for row in data[:limit]:
                    if isinstance(row, dict):
                        lines.append("| " + " | ".join(str(row.get(k, "")) for k in keys) + " |")

            return {"content": "\n".join(lines)}

    except Exception as e:
        return {"content": f"处理查询时出错: {str(e)}"}


def run_server(host: str = "0.0.0.0", port: int = 8080):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
