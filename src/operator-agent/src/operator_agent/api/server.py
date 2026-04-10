"""FastAPI server for operator-agent NL2SQL endpoints."""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from ..operator_agent import OperatorAgent, OperatorAgentFactory
from ..config import load_operator_config
from .auth import verify_api_key, get_allowed_origins
from .errors import (
    ErrorCode,
    get_error_response,
    get_locale_from_headers,
    SUPPORTED_LOCALES,
    GET_SITE_CELLS_FAILED,
    GET_INDICATORS_FAILED,
    GET_OPERATORS_FAILED,
    GET_AVAILABLE_TIMES_FAILED,
    NL2SQL_QUERY_FAILED,
    INTERNAL_ERROR,
    INTENT_DETECTION_FAILED,
)

app = FastAPI(title="Operator Agent API", version="1.0.0")


def get_locale(x_locale: str = Header(default="zh", alias="X-Locale")) -> str:
    """Extract and validate locale from X-Locale header.

    Args:
        x_locale: Locale value from X-Locale header

    Returns:
        Valid locale string ('en' or 'zh')
    """
    if x_locale not in SUPPORTED_LOCALES:
        return "zh"
    return x_locale

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
async def get_latest_indicators(query: IndicatorQuery, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
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
        raise HTTPException(status_code=500, detail=get_error_response(GET_INDICATORS_FAILED, locale, result["error"]))

    return result


@app.post("/api/operator/indicators/compare")
async def compare_indicators(query: CompareQuery, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
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
        raise HTTPException(status_code=500, detail=get_error_response(GET_INDICATORS_FAILED, locale, result["error"]))

    return result


@app.post("/api/operator/indicators/trend")
async def get_indicator_trend(query: TrendQuery, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
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
        raise HTTPException(status_code=500, detail=get_error_response(GET_INDICATORS_FAILED, locale, result["error"]))

    return result


@app.post("/api/operator/times")
async def get_available_times(query: TimesQuery, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
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
        raise HTTPException(status_code=500, detail=get_error_response(GET_AVAILABLE_TIMES_FAILED, locale, result["error"]))

    return result


@app.post("/api/operator/nl2sql/query")
async def nl2sql_query(request: Dict[str, Any], _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Execute natural language query via NL2SQL."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/query",
        method="POST",
        body=request,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(NL2SQL_QUERY_FAILED, locale, result["error"]))

    return result


@app.post("/api/operator/site-cells")
async def get_site_cells(query: SiteCellsQuery, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
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
        raise HTTPException(status_code=500, detail=get_error_response(GET_SITE_CELLS_FAILED, locale, result["error"]))

    return result


@app.get("/api/operator/all-data")
async def get_all_operators_data(_: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get aggregated data for all operators (site cells summary + latest indicators).

    Returns data from all operators in a single call for efficient dashboard loading.
    """
    agent = await get_agent()

    try:
        # Fetch operators list
        operators_result = await agent.call_java_service(
            service_name="nl2sql-service",
            endpoint="/operators",
            method="GET",
        )
        if operators_result.get("error"):
            raise HTTPException(status_code=500, detail=get_error_response(GET_OPERATORS_FAILED, locale, operators_result["error"]))

        operators = operators_result.get("data", []) if isinstance(operators_result, dict) else operators_result
        operators = operators if isinstance(operators, list) else []

        # Fetch all site cells and indicators in parallel
        async def fetch_operator_data(op_id: int, op_name: str):
            try:
                site_cells_result = await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint="/site-summary",
                    method="GET",
                    query_params={"operatorId": op_id} if op_id else {},
                )
                indicators_result = await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint="/indicators/latest",
                    method="GET",
                    query_params={"operatorName": op_name, "limit": 10},
                )
                site_cells = site_cells_result.get("data", []) if isinstance(site_cells_result, dict) else site_cells_result
                indicators = indicators_result.get("data", []) if isinstance(indicators_result, dict) else indicators_result
                return {
                    "operatorId": op_id,
                    "operatorName": op_name,
                    "siteCells": site_cells if isinstance(site_cells, list) else [],
                    "indicators": indicators if isinstance(indicators, list) else [],
                    "error": None,
                }
            except Exception as e:
                return {
                    "operatorId": op_id,
                    "operatorName": op_name,
                    "siteCells": [],
                    "indicators": [],
                    "error": str(e),
                }

        # Fetch data for all operators
        tasks = [fetch_operator_data(op.get("id"), op.get("operatorName", "")) for op in operators]
        operator_data_results = await asyncio.gather(*tasks)

        # Calculate summary totals
        total_lte_site = 0
        total_lte_cell = 0
        total_nr_site = 0
        total_nr_cell = 0
        for op_data in operator_data_results:
            for sc in op_data.get("siteCells", []):
                if isinstance(sc, dict):
                    total_lte_site += sc.get("lteTotalSite", 0)
                    total_lte_cell += sc.get("lteTotalCell", 0)
                    total_nr_site += sc.get("nrTotalSite", 0)
                    total_nr_cell += sc.get("nrTotalCell", 0)

        return {
            "operators": operator_data_results,
            "summary": {
                "totalLteSite": total_lte_site,
                "totalLteCell": total_lte_cell,
                "totalNrSite": total_nr_site,
                "totalNrCell": total_nr_cell,
                "totalSite": total_lte_site + total_nr_site,
                "totalCell": total_lte_cell + total_nr_cell,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=get_error_response(INTERNAL_ERROR, locale, str(e)))


def format_site_data_with_chart(site_cells: list, operators: list, latest_only: bool = False) -> Dict[str, Any]:
    """Format site cell data into structured blocks with chart data.

    Returns content with :::chart, :::table blocks showing each band separately.
    """
    if not site_cells:
        return {"content": "未找到站点数据", "chart": None}

    # Get operator names and regions
    operator_map = {}
    operator_region_map = {}
    for op in operators:
        if isinstance(op, dict):
            operator_map[op.get("id")] = op.get("operatorName", "Unknown")
            operator_region_map[op.get("id")] = op.get("region", "")

    # Data per band for chart
    band_chart_data = []
    # Data per operator per band for table
    band_table_rows = []

    # Group by operator
    operator_ids = set()
    for sc in site_cells:
        if isinstance(sc, dict) and "operatorId" in sc:
            operator_ids.add(sc["operatorId"])

    for op_id in sorted(operator_ids):
        op_name = operator_map.get(op_id, f"运营商{op_id}")
        region = operator_region_map.get(op_id, "")

        # Filter site cells for this operator
        op_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("operatorId") == op_id]

        if not op_cells:
            continue

        # For each month data
        for cell in op_cells:
            data_month = cell.get("dataMonth", "")

            # LTE bands - each band as separate row
            lte_bands = [
                ("LTE 700M", cell.get("lte700MSite", 0), cell.get("lte700MCell", 0)),
                ("LTE 800M", cell.get("lte800MSite", 0), cell.get("lte800MCell", 0)),
                ("LTE 900M", cell.get("lte900MSite", 0), cell.get("lte900MCell", 0)),
                ("LTE 1400M", cell.get("lte1400MSite", 0), cell.get("lte1400MCell", 0)),
                ("LTE 1800M", cell.get("lte1800MSite", 0), cell.get("lte1800MCell", 0)),
                ("LTE 2100M", cell.get("lte2100MSite", 0), cell.get("lte2100MCell", 0)),
                ("LTE 2600M", cell.get("lte2600MSite", 0), cell.get("lte2600MCell", 0)),
            ]
            for band_name, sites, cells in lte_bands:
                if sites or cells:
                    band_chart_data.append({"运营商": op_name, "频段": band_name, "站点": sites, "小区": cells})
                    band_table_rows.append({
                        "operator": op_name,
                        "region": region,
                        "dataMonth": data_month,
                        "band": band_name,
                        "site": sites,
                        "cell": cells,
                    })

            # NR bands - each band as separate row
            nr_bands = [
                ("NR 700M", cell.get("nr700MSite", 0), cell.get("nr700MCell", 0)),
                ("NR 800M", cell.get("nr800MSite", 0), cell.get("nr800MCell", 0)),
                ("NR 900M", cell.get("nr900MSite", 0), cell.get("nr900MCell", 0)),
                ("NR 1400M", cell.get("nr1400MSite", 0), cell.get("nr1400MCell", 0)),
                ("NR 1800M", cell.get("nr1800MSite", 0), cell.get("nr1800MCell", 0)),
                ("NR 2100M", cell.get("nr2100MSite", 0), cell.get("nr2100MCell", 0)),
                ("NR 2600M", cell.get("nr2600MSite", 0), cell.get("nr2600MCell", 0)),
                ("NR 3500M", cell.get("nr3500MSite", 0), cell.get("nr3500MCell", 0)),
                ("NR 4900M", cell.get("nr4900MSite", 0), cell.get("nr4900MCell", 0)),
                ("NR 2300M", cell.get("nr2300MSite", 0), cell.get("nr2300MCell", 0)),
            ]
            for band_name, sites, cells in nr_bands:
                if sites or cells:
                    band_chart_data.append({"运营商": op_name, "频段": band_name, "站点": sites, "小区": cells})
                    band_table_rows.append({
                        "operator": op_name,
                        "region": region,
                        "dataMonth": data_month,
                        "band": band_name,
                        "site": sites,
                        "cell": cells,
                    })

    # Define all bands
    LTE_BANDS = [
        ("LTE 700M", "lte700MSite", "lte700MCell"),
        ("LTE 800M", "lte800MSite", "lte800MCell"),
        ("LTE 900M", "lte900MSite", "lte900MCell"),
        ("LTE 1400M", "lte1400MSite", "lte1400MCell"),
        ("LTE 1800M", "lte1800MSite", "lte1800MCell"),
        ("LTE 2100M", "lte2100MSite", "lte2100MCell"),
        ("LTE 2600M", "lte2600MSite", "lte2600MCell"),
    ]
    NR_BANDS = [
        ("NR 700M", "nr700MSite", "nr700MCell"),
        ("NR 800M", "nr800MSite", "nr800MCell"),
        ("NR 900M", "nr900MSite", "nr900MCell"),
        ("NR 1400M", "nr1400MSite", "nr1400MCell"),
        ("NR 1800M", "nr1800MSite", "nr1800MCell"),
        ("NR 2100M", "nr2100MSite", "nr2100MCell"),
        ("NR 2600M", "nr2600MSite", "nr2600MCell"),
        ("NR 3500M", "nr3500MSite", "nr3500MCell"),
        ("NR 4900M", "nr4900MSite", "nr4900MCell"),
        ("NR 2300M", "nr2300MSite", "nr2300MCell"),
    ]
    ALL_BANDS = LTE_BANDS + NR_BANDS

    # Build pivoted table data (dates as rows, bands as columns)
    toggle_blocks = []

    for op_id in sorted(operator_ids):
        op_name = operator_map.get(op_id, f"运营商{op_id}")
        region = operator_region_map.get(op_id, "")

        op_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("operatorId") == op_id]
        if not op_cells:
            continue

        # Group by month
        month_data = {}
        for cell in op_cells:
            data_month = cell.get("dataMonth", "")
            if data_month not in month_data:
                month_data[data_month] = cell

        # Table: dates as rows, bands as columns (站点 and 小区 sub-columns)
        table_headers = ["数据月"]
        for band_name, _, _ in ALL_BANDS:
            table_headers.append(f"{band_name} 站点")
            table_headers.append(f"{band_name} 小区")

        table_rows = []
        chart_data = []

        for data_month in sorted(month_data.keys()):
            cell = month_data[data_month]
            row = [data_month]
            month_chart_item = {"数据月": data_month}

            for band_name, site_key, cell_key in ALL_BANDS:
                sites = cell.get(site_key, 0) or 0
                cells = cell.get(cell_key, 0) or 0
                row.append(sites)
                row.append(cells)
                month_chart_item[f"{band_name}站点"] = sites
                month_chart_item[f"{band_name}小区"] = cells

            table_rows.append(row)
            chart_data.append(month_chart_item)

        # Build toggle block
        toggle_lines = [":::toggle[site_cells]"]

        # Add table section
        toggle_lines.append("[table]")
        toggle_lines.append("| " + " | ".join(table_headers) + " |")
        toggle_lines.append("| " + " | ".join(["---"] * len(table_headers)) + " |")
        for row in table_rows:
            toggle_lines.append("| " + " | ".join(str(v) for v in row) + " |")

        # Add chart section - limit to top 8 bands by total value for readability
        toggle_lines.append("[chart]")
        # Calculate band totals across all months for ranking
        band_totals = {}
        for item in chart_data:
            for band_name, _, _ in ALL_BANDS:
                site_val = item.get(f"{band_name}站点", 0) or 0
                cell_val = item.get(f"{band_name}小区", 0) or 0
                if band_name not in band_totals:
                    band_totals[band_name] = 0
                band_totals[band_name] += site_val + cell_val

        # Get top 8 bands
        top_bands = sorted(band_totals.keys(), key=lambda b: band_totals[b], reverse=True)[:8]

        for item in chart_data:
            chart_parts = []
            for band_name in top_bands:
                site_val = item.get(f"{band_name}站点", 0) or 0
                cell_val = item.get(f"{band_name}小区", 0) or 0
                if site_val > 0:
                    chart_parts.append(f"- {band_name} 站点: {site_val}")
                if cell_val > 0:
                    chart_parts.append(f"- {band_name} 小区: {cell_val}")
            chart_lines = "\n".join(chart_parts)
            toggle_lines.append(chart_lines)

        toggle_lines.append(":::")
        toggle_blocks.append(f"**{op_name}** ({region})\n" + "\n".join(toggle_lines))

    content_parts = ["# 运营商站点信息\n"]
    content_parts.append("\n\n".join(toggle_blocks))

    return {"content": "\n".join(content_parts), "chart": None}


def format_site_data(site_cells: list, operators: list, latest_only: bool = False) -> str:
    """Format site cell data into markdown table format (legacy)."""
    result = format_site_data_with_chart(site_cells, operators, latest_only)
    return result["content"]


@app.post("/api/agent/run")
async def agent_run(request: AgentRunRequest, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """
    Run the agent with user input (synchronous JSON response).
    """
    result = await _process_agent_request(request.input, request.confirmed, locale)
    return result


@app.post("/api/agent/stream")
async def agent_stream(request: AgentRunRequest, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """
    Run the agent with user input (SSE streaming response).
    """
    from fastapi.responses import StreamingResponse

    async def generate():
        try:
            # Send start marker
            yield "data: {\"type\": \"start\"}\n\n"

            # Process request
            result = await _process_agent_request(request.input, request.confirmed, locale)

            # Send result as SSE - check for error code format first
            if "code" in result and "message" in result:
                # New error code format
                yield f"data: {{\"type\": \"error\", \"code\": {json.dumps(result['code'])}, \"message\": {json.dumps(result['message'])}, \"detail\": {json.dumps(result.get('detail'))}}}\n\n"
            elif "error" in result:
                # Legacy error format
                yield f"data: {{\"type\": \"error\", \"content\": {json.dumps(result['error'])}}}\n\n"
            elif "content" in result:
                # Stream content word by word for better UX
                content = result["content"]
                for i in range(0, len(content), 50):
                    chunk = content[i:i+50]
                    yield f"data: {{\"type\": \"content\", \"content\": {json.dumps(chunk)}}}\n\n"
                    await asyncio.sleep(0.01)  # Small delay for streaming effect
                # Send chart data if available
                if result.get("chart"):
                    yield f"data: {{\"type\": \"chart\", \"chart\": {json.dumps(result['chart'])} }}\n\n"
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


def _filter_by_operator(site_cells: list, operators: list, operator_name: str) -> list:
    """Filter site cells by operator name (fuzzy match)."""
    if not operator_name:
        return site_cells
    op_id = None
    for op in operators:
        if isinstance(op, dict):
            op_name = op.get("operatorName", "")
            if op_name == operator_name or operator_name in op_name or op_name in operator_name:
                op_id = op.get("id")
                break
    if op_id:
        return [sc for sc in site_cells if isinstance(sc, dict) and sc.get("operatorId") == op_id]
    return site_cells


def _build_thinking_chain(query: str, intent: str, operator_name: str = None, data_type: str = None) -> str:
    """Build thinking chain content for display."""
    steps = [
        f"分析用户查询：{query}",
        f"意图检测：{intent}",
    ]
    if operator_name:
        steps.append(f"识别运营商：{operator_name}")
    if data_type:
        steps.append(f"数据类型：{data_type}")
    steps.append("调用NL2SQL服务获取数据")
    steps.append("格式化返回结果")
    return "<!-- thinking_start -->\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps)) + "\n<!-- thinking_end -->"


async def _process_agent_request(user_input: str, confirmed: bool = False, locale: str = "zh") -> Dict[str, Any]:
    """
    Shared logic for processing agent requests.
    """
    agent = await get_agent()

    try:
        # Use LLM to analyze the query intent
        intent_result = await agent.process_natural_language_query(user_input)

        if intent_result.get("error"):
            return get_error_response(INTENT_DETECTION_FAILED, locale, intent_result["error"])

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
        if isinstance(operators_result, dict) and operators_result.get("error") is None:
            operators = operators_result.get("data", [])
            operators = operators if isinstance(operators, list) else []

        # Route based on LLM-detected intent
        if intent == "site_data":
            site_cells_result = await agent.get_site_cells()
            if site_cells_result.get("error"):
                return get_error_response(GET_SITE_CELLS_FAILED, locale, site_cells_result["error"])

            site_cells = site_cells_result.get("data") if isinstance(site_cells_result, dict) else site_cells_result
            site_cells = site_cells if isinstance(site_cells, list) else []

            # Filter by operator if specified
            site_cells = _filter_by_operator(site_cells, operators, operator_name)

            if data_month:
                site_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("dataMonth") == data_month]

            chart_result = format_site_data_with_chart(site_cells, operators, latest_only=False)
            thinking = _build_thinking_chain(user_input, "site_data - 站点数据查询", operator_name, "站点小区汇总")
            return {"content": thinking + "\n\n" + chart_result["content"], "chart": chart_result.get("chart")}

        elif intent == "latest_data":
            site_cells_result = await agent.get_site_cells()
            if site_cells_result.get("error"):
                return get_error_response(GET_SITE_CELLS_FAILED, locale, site_cells_result["error"])

            site_cells = site_cells_result.get("data") if isinstance(site_cells_result, dict) else site_cells_result
            site_cells = site_cells if isinstance(site_cells, list) else []

            # Filter by operator if specified
            site_cells = _filter_by_operator(site_cells, operators, operator_name)

            latest_month = None
            for sc in site_cells:
                if isinstance(sc, dict) and sc.get("dataMonth"):
                    month = sc.get("dataMonth")
                    if latest_month is None or month > latest_month:
                        latest_month = month

            if latest_month:
                site_cells = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("dataMonth") == latest_month]

            # Use format_site_data_with_chart for chart support
            chart_result = format_site_data_with_chart(site_cells, operators, latest_only=True)
            lines = [f"# 运营商最新数据 (数据月份: {latest_month})\n"]
            content_lines = chart_result["content"].split("\n", 1)
            if len(content_lines) > 1:
                lines.append(content_lines[1])
            thinking = _build_thinking_chain(user_input, "latest_data - 最新数据查询", operator_name, "站点小区汇总")
            return {"content": thinking + "\n\n" + ("\n".join(lines) if lines[-1] else chart_result["content"]), "chart": chart_result.get("chart")}

        elif intent == "indicator_data":
            indicators_result = await agent.get_latest_indicators(limit=limit)
            if indicators_result.get("error"):
                return get_error_response(GET_INDICATORS_FAILED, locale, indicators_result["error"])

            data = indicators_result.get("data", indicators_result) if isinstance(indicators_result, dict) else indicators_result
            if not data:
                return {"content": "未找到指标数据"}

            # Format indicator data with chart and table per band
            content_parts = ["# 运营商指标数据\n"]
            chart_data = []
            table_rows = []

            items = data[:limit] if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                data_month = item.get('dataMonth', 'N/A')

                # LTE bands - each band as separate row
                lte_bands = [
                    ("LTE 700M", item.get("lte700MDlRate"), item.get("lte700MUlRate"), item.get("lte700MDlPrb")),
                    ("LTE 800M", item.get("lte800MDlRate"), item.get("lte800MUlRate"), item.get("lte800MDlPrb")),
                    ("LTE 900M", item.get("lte900MDlRate"), item.get("lte900MUlRate"), item.get("lte900MDlPrb")),
                    ("LTE 1400M", item.get("lte1400MDlRate"), item.get("lte1400MUlRate"), item.get("lte1400MDlPrb")),
                    ("LTE 1800M", item.get("lte1800MDlRate"), item.get("lte1800MUlRate"), item.get("lte1800MDlPrb")),
                    ("LTE 2100M", item.get("lte2100MDlRate"), item.get("lte2100MUlRate"), item.get("lte2100MDlPrb")),
                    ("LTE 2600M", item.get("lte2600MDlRate"), item.get("lte2600MUlRate"), item.get("lte2600MDlPrb")),
                ]
                for band, dl, ul, prb in lte_bands:
                    if dl or ul or prb:
                        chart_data.append({"频段": band, "下行速率": dl or 0, "上行速率": ul or 0, "下行PRB": prb or 0})
                        table_rows.append({"数据月": data_month, "频段": band, "下行速率": dl, "上行速率": ul, "下行PRB": prb})

                # NR bands - each band as separate row
                nr_bands = [
                    ("NR 700M", item.get("nr700MDlRate"), item.get("nr700MUlRate"), item.get("nr700MDlPrb")),
                    ("NR 800M", item.get("nr800MDlRate"), item.get("nr800MUlRate"), item.get("nr800MDlPrb")),
                    ("NR 900M", item.get("nr900MDlRate"), item.get("nr900MUlRate"), item.get("nr900MDlPrb")),
                    ("NR 1400M", item.get("nr1400MDlRate"), item.get("nr1400MUlRate"), item.get("nr1400MDlPrb")),
                    ("NR 1800M", item.get("nr1800MDlRate"), item.get("nr1800MUlRate"), item.get("nr1800MDlPrb")),
                    ("NR 2100M", item.get("nr2100MDlRate"), item.get("nr2100MUlRate"), item.get("nr2100MDlPrb")),
                    ("NR 2600M", item.get("nr2600MDlRate"), item.get("nr2600MUlRate"), item.get("nr2600MDlPrb")),
                    ("NR 3500M", item.get("nr3500MDlRate"), item.get("nr3500MUlRate"), item.get("nr3500MDlPrb")),
                    ("NR 4900M", item.get("nr4900MDlRate"), item.get("nr4900MUlRate"), item.get("nr4900MDlPrb")),
                    ("NR 2300M", item.get("nr2300MDlRate"), item.get("nr2300MUlRate"), item.get("nr2300MDlPrb")),
                ]
                for band, dl, ul, prb in nr_bands:
                    if dl or ul or prb:
                        chart_data.append({"频段": band, "下行速率": dl or 0, "上行速率": ul or 0, "下行PRB": prb or 0})
                        table_rows.append({"数据月": data_month, "频段": band, "下行速率": dl, "上行速率": ul, "下行PRB": prb})

            # Add chart block
            if chart_data:
                chart_lines = [":::chart[bar]"]
                for item in chart_data[:20]:
                    chart_lines.append(f"- {item['频段']} 下行: {item['下行速率']} Mbps")
                chart_lines.append(":::")
                content_parts.append("\n".join(chart_lines))

            # Add table block - each band as separate row
            if table_rows:
                table_lines = [":::table"]
                table_lines.append("| 数据月 | 频段 | 下行速率(Mbps) | 上行速率(Mbps) | 下行PRB(%) |")
                table_lines.append("|--------|------|----------------|----------------|------------|")
                for row in table_rows:
                    dl = row['下行速率'] if row['下行速率'] is not None else 'N/A'
                    ul = row['上行速率'] if row['上行速率'] is not None else 'N/A'
                    prb = row['下行PRB'] if row['下行PRB'] is not None else 'N/A'
                    table_lines.append(f"| {row['数据月']} | {row['频段']} | {dl} | {ul} | {prb} |")
                table_lines.append(":::")
                content_parts.append("\n".join(table_lines))

            thinking = _build_thinking_chain(user_input, "indicator_data - 指标数据查询", operator_name, "性能指标")
            return {"content": thinking + "\n\n" + "\n".join(content_parts), "chart": {"type": "bar", "column": "频段", "data": chart_data, "keys": ["下行速率", "上行速率"], "colors": ["#10b981", "#4f46e5"]} if chart_data else None}

        elif intent == "operator_list":
            operators_result = await agent.call_java_service(
                service_name="nl2sql-service",
                endpoint="/operators",
                method="GET",
            )
            if operators_result.get("error"):
                return get_error_response(GET_OPERATORS_FAILED, locale, operators_result["error"])

            operators = operators_result.get("data") if isinstance(operators_result, dict) else operators_result
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

            thinking = _build_thinking_chain(user_input, "operator_list - 运营商列表查询", None, "运营商基础信息")
            return {"content": thinking + "\n\n" + "\n".join(lines)}

        elif intent == "nl2sql":
            nl2sql_result = await agent.query_nl2sql(natural_language_query=user_input)
            if nl2sql_result.get("error"):
                return get_error_response(NL2SQL_QUERY_FAILED, locale, nl2sql_result["error"])

            data = nl2sql_result.get("data", []) if isinstance(nl2sql_result, dict) else nl2sql_result
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

            thinking = _build_thinking_chain(user_input, "nl2sql - 自然语言查询", operator_name, "数据库记录")
            return {"content": thinking + "\n\n" + "\n".join(lines)}

        else:
            # Fallback to NL2SQL
            nl2sql_result = await agent.query_nl2sql(natural_language_query=user_input)
            if nl2sql_result.get("error"):
                return get_error_response(NL2SQL_QUERY_FAILED, locale, nl2sql_result["error"])

            data = nl2sql_result.get("data", []) if isinstance(nl2sql_result, dict) else nl2sql_result
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

            thinking = _build_thinking_chain(user_input, "nl2sql - 自然语言查询(兜底)", operator_name, "数据库记录")
            return {"content": thinking + "\n\n" + "\n".join(lines)}

    except Exception as e:
        return get_error_response(INTERNAL_ERROR, locale, str(e))


def run_server(host: str = "0.0.0.0", port: int = 8080):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run_server()
