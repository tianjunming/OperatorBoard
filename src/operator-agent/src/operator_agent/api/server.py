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


class OperatorSitesLatestQuery(BaseModel):
    operatorName: str


class OperatorIndicatorsLatestQuery(BaseModel):
    operatorName: str


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


@app.get("/api/operator/operators/{operator_name}/sites/latest")
async def get_operator_sites_latest(operator_name: str, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get latest site cell summary for a specific operator by name."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint=f"/operators/{operator_name}/sites/latest",
        method="GET",
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(GET_SITE_CELLS_FAILED, locale, result["error"]))

    return result


@app.get("/api/operator/operators/{operator_name}/sites/history")
async def get_operator_sites_history(operator_name: str, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get site cell summary history for a specific operator by name."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint=f"/operators/{operator_name}/sites/history",
        method="GET",
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(GET_SITE_CELLS_FAILED, locale, result["error"]))

    return result


@app.get("/api/operator/operators/all/sites/latest")
async def get_all_operators_sites_latest(_: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get latest site cell summary for all operators."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/operators/all/sites/latest",
        method="GET",
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(GET_SITE_CELLS_FAILED, locale, result["error"]))

    return result


@app.get("/api/operator/operators/{operator_name}/indicators/latest")
async def get_operator_indicators_latest(operator_name: str, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get latest indicators for a specific operator by name."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint=f"/operators/{operator_name}/indicators/latest",
        method="GET",
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(GET_INDICATORS_FAILED, locale, result["error"]))

    return result


@app.get("/api/operator/operators/{operator_name}/indicators/history")
async def get_operator_indicators_history(operator_name: str, _: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get indicator history for a specific operator by name."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint=f"/operators/{operator_name}/indicators/history",
        method="GET",
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(GET_INDICATORS_FAILED, locale, result["error"]))

    return result


@app.get("/api/operator/operators/all/indicators/latest")
async def get_all_operators_indicators_latest(_: bool = Depends(verify_api_key), locale: str = Depends(get_locale)):
    """Get latest indicators for all operators."""
    agent = await get_agent()

    result = await agent.call_java_service(
        service_name="nl2sql-service",
        endpoint="/operators/all/indicators/latest",
        method="GET",
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=get_error_response(GET_INDICATORS_FAILED, locale, result["error"]))

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
    """Format site cell data into industry-standard structured blocks.

    Returns content with :::toggle{json}::: blocks that frontend can parse properly.
    """
    if not site_cells:
        return {"content": "未找到站点数据", "chart": None}

    # Band definitions
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

    # Get operator names and regions
    operator_map = {}
    operator_region_map = {}
    for op in operators:
        if isinstance(op, dict):
            operator_map[op.get("id")] = op.get("operatorName", "Unknown")
            operator_region_map[op.get("id")] = op.get("region", "")

    # Group by operator
    operator_ids = set()
    for sc in site_cells:
        if isinstance(sc, dict) and "operatorId" in sc:
            operator_ids.add(sc["operatorId"])

    # Build structured toggle blocks
    toggle_blocks = []
    total_stats = {"site": 0, "cell": 0, "operators": len(operator_ids)}

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

        # Build structured table data
        table_columns = ["月份", "制式", "频段", "站点数", "小区数"]
        table_data = []
        chart_data = []

        # Aggregate for chart - by band totals across all months
        band_site_totals = {}
        band_cell_totals = {}
        for band_name, _, _ in ALL_BANDS:
            band_site_totals[band_name] = 0
            band_cell_totals[band_name] = 0

        for data_month in sorted(month_data.keys(), reverse=True)[:6]:  # Latest 6 months
            cell = month_data[data_month]

            # LTE bands
            lte_month_site = 0
            lte_month_cell = 0
            for band_name, site_key, cell_key in LTE_BANDS:
                sites = cell.get(site_key, 0) or 0
                cells = cell.get(cell_key, 0) or 0
                if sites > 0 or cells > 0:
                    table_data.append({
                        "月份": data_month,
                        "制式": "LTE",
                        "频段": band_name,
                        "站点数": sites,
                        "小区数": cells
                    })
                    band_site_totals[band_name] += sites
                    band_cell_totals[band_name] += cells
                    lte_month_site += sites
                    lte_month_cell += cells

            # NR bands
            nr_month_site = 0
            nr_month_cell = 0
            for band_name, site_key, cell_key in NR_BANDS:
                sites = cell.get(site_key, 0) or 0
                cells = cell.get(cell_key, 0) or 0
                if sites > 0 or cells > 0:
                    table_data.append({
                        "月份": data_month,
                        "制式": "NR",
                        "频段": band_name,
                        "站点数": sites,
                        "小区数": cells
                    })
                    band_site_totals[band_name] += sites
                    band_cell_totals[band_name] += cells
                    nr_month_site += sites
                    nr_month_cell += cells

            # Add monthly summary row for chart
            chart_data.append({
                "月份": data_month,
                "LTE站点": lte_month_site,
                "LTE小区": lte_month_cell,
                "NR站点": nr_month_site,
                "NR小区": nr_month_cell,
                "总站点": lte_month_site + nr_month_site,
                "总小区": lte_month_cell + nr_month_cell
            })

        # Calculate operator totals
        op_total_site = sum(band_site_totals.values())
        op_total_cell = sum(band_cell_totals.values())
        total_stats["site"] += op_total_site
        total_stats["cell"] += op_total_cell

        # Build chart keys (top 8 bands by total)
        band_totals = [(b, band_site_totals[b] + band_cell_totals[b]) for b in band_site_totals]
        top_bands = sorted(band_totals, key=lambda x: x[1], reverse=True)[:8]
        chart_keys = [b[0] for b in top_bands]

        # Build toggle JSON structure
        toggle_obj = {
            "title": f"{op_name} 站点数据",
            "subtitle": region,
            "summary": {
                "totalSite": op_total_site,
                "totalCell": op_total_cell,
                "bandCount": len([b for b in chart_keys if band_site_totals[b] > 0 or band_cell_totals[b] > 0])
            },
            "table": {
                "columns": table_columns,
                "data": table_data
            },
            "chart": {
                "type": "bar",
                "data": chart_data,
                "keys": ["总站点", "总小区"],
                "column": "月份"
            }
        }

        # Calculate summary values
        band_count = len([b for b in chart_keys if band_site_totals.get(b, 0) > 0 or band_cell_totals.get(b, 0) > 0])

        # Use simple key-value format instead of JSON to avoid escaping issues
        table_data_str = ";".join([f"{r['月份']}|{r['制式']}|{r['频段']}|{r['站点数']}|{r['小区数']}" for r in table_data]) if table_data else ""
        chart_data_str = ";".join([f"{c['月份']},{c['LTE站点']},{c['LTE小区']},{c['NR站点']},{c['NR小区']},{c['总站点']},{c['总小区']}" for c in chart_data]) if chart_data else ""

        toggle_block = f"""[toggle]
[type::site]
[title::{op_name} 站点数据]
[subtitle::{region}]
[summary::totalSite={op_total_site};totalCell={op_total_cell};bandCount={band_count}]
[table_columns::{",".join(table_columns)}]
[table_data::{table_data_str}]
[chart_keys::总站点,总小区]
[chart_data::{chart_data_str}]
[/toggle]"""
        toggle_blocks.append(toggle_block)

    # Build summary header
    summary_text = f"""# 运营商站点概况

**总计**: {total_stats['operators']} 个运营商 | {total_stats['site']:,} 站点 | {total_stats['cell']:,} 小区

"""

    return {
        "content": summary_text + "\n\n".join(toggle_blocks),
        "chart": None
    }


def format_indicator_data_with_chart(indicators: list, operators: list) -> Dict[str, Any]:
    """Format indicator data into industry-standard structured blocks.

    Returns content with [toggle] blocks for frontend parsing.
    Network indicators include: DL rate, UL rate, DL PRB, UL PRB per band.
    """
    if not indicators:
        return {"content": "未找到指标数据", "chart": None}

    # Band definitions for indicators
    LTE_BANDS = [
        ("LTE 700M", "lte700MDlRate", "lte700MUlRate", "lte700MDlPrb", "lte700MUlPrb"),
        ("LTE 800M", "lte800MDlRate", "lte800MUlRate", "lte800MDlPrb", "lte800MUlPrb"),
        ("LTE 900M", "lte900MDlRate", "lte900MUlRate", "lte900MDlPrb", "lte900MUlPrb"),
        ("LTE 1400M", "lte1400MDlRate", "lte1400MUlRate", "lte1400MDlPrb", "lte1400MUlPrb"),
        ("LTE 1800M", "lte1800MDlRate", "lte1800MUlRate", "lte1800MDlPrb", "lte1800MUlPrb"),
        ("LTE 2100M", "lte2100MDlRate", "lte2100MUlRate", "lte2100MDlPrb", "lte2100MUlPrb"),
        ("LTE 2600M", "lte2600MDlRate", "lte2600MUlRate", "lte2600MDlPrb", "lte2600MUlPrb"),
    ]
    NR_BANDS = [
        ("NR 700M", "nr700MDlRate", "nr700MUlRate", "nr700MDlPrb", "nr700MUlPrb"),
        ("NR 800M", "nr800MDlRate", "nr800MUlRate", "nr800MDlPrb", "nr800MUlPrb"),
        ("NR 900M", "nr900MDlRate", "nr900MUlRate", "nr900MDlPrb", "nr900MUlPrb"),
        ("NR 1400M", "nr1400MDlRate", "nr1400MUlRate", "nr1400MDlPrb", "nr1400MUlPrb"),
        ("NR 1800M", "nr1800MDlRate", "nr1800MUlRate", "nr1800MDlPrb", "nr1800MUlPrb"),
        ("NR 2100M", "nr2100MDlRate", "nr2100MUlRate", "nr2100MDlPrb", "nr2100MUlPrb"),
        ("NR 2600M", "nr2600MDlRate", "nr2600MUlRate", "nr2600MDlPrb", "nr2600MUlPrb"),
        ("NR 3500M", "nr3500MDlRate", "nr3500MUlRate", "nr3500MDlPrb", "nr3500MUlPrb"),
        ("NR 4900M", "nr4900MDlRate", "nr4900MUlRate", "nr4900MDlPrb", "nr4900MUlPrb"),
        ("NR 2300M", "nr2300MDlRate", "nr2300MUlRate", "nr2300MDlPrb", "nr2300MUlPrb"),
    ]

    # Get operator info
    operator_map = {}
    for op in operators:
        if isinstance(op, dict):
            operator_map[op.get("id")] = {
                "name": op.get("operatorName", "Unknown"),
                "region": op.get("region", "")
            }

    # Process indicators by operator and month
    toggle_blocks = []
    all_months = sorted(set(item.get("dataMonth", "") for item in indicators if isinstance(item, dict)), reverse=True)
    latest_month = all_months[0] if all_months else ""

    for indicator in indicators:
        if not isinstance(indicator, dict):
            continue

        op_id = indicator.get("operatorId")
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}", "region": ""})
        op_name = op_info["name"]
        region = op_info["region"]
        data_month = indicator.get("dataMonth", "")

        # Build table data
        table_columns = ["月份", "制式", "频段", "下行速率(Mbps)", "上行速率(Mbps)", "下行PRB(%)", "上行PRB(%)"]
        table_data = []
        chart_data = []

        # Process LTE bands
        lte_avg_dl, lte_avg_ul, lte_avg_prb_dl, lte_avg_prb_ul = 0, 0, 0, 0
        lte_count = 0
        for band_name, dl_key, ul_key, prb_dl_key, prb_ul_key in LTE_BANDS:
            dl = indicator.get(dl_key) or 0
            ul = indicator.get(ul_key) or 0
            prb_dl = indicator.get(prb_dl_key) or 0
            prb_ul = indicator.get(prb_ul_key) or 0
            if dl or ul or prb_dl or prb_ul:
                table_data.append({
                    "月份": data_month,
                    "制式": "LTE",
                    "频段": band_name,
                    "下行速率(Mbps)": round(dl, 2) if dl else 0,
                    "上行速率(Mbps)": round(ul, 2) if ul else 0,
                    "下行PRB(%)": round(prb_dl, 1) if prb_dl else 0,
                    "上行PRB(%)": round(prb_ul, 1) if prb_ul else 0,
                })
                lte_avg_dl += dl
                lte_avg_ul += ul
                lte_avg_prb_dl += prb_dl
                lte_avg_prb_ul += prb_ul
                lte_count += 1

        if lte_count > 0:
            lte_avg_dl /= lte_count
            lte_avg_ul /= lte_count
            lte_avg_prb_dl /= lte_count
            lte_avg_prb_ul /= lte_count

        # Process NR bands
        nr_avg_dl, nr_avg_ul, nr_avg_prb_dl, nr_avg_prb_ul = 0, 0, 0, 0
        nr_count = 0
        for band_name, dl_key, ul_key, prb_dl_key, prb_ul_key in NR_BANDS:
            dl = indicator.get(dl_key) or 0
            ul = indicator.get(ul_key) or 0
            prb_dl = indicator.get(prb_dl_key) or 0
            prb_ul = indicator.get(prb_ul_key) or 0
            if dl or ul or prb_dl or prb_ul:
                table_data.append({
                    "月份": data_month,
                    "制式": "NR",
                    "频段": band_name,
                    "下行速率(Mbps)": round(dl, 2) if dl else 0,
                    "上行速率(Mbps)": round(ul, 2) if ul else 0,
                    "下行PRB(%)": round(prb_dl, 1) if prb_dl else 0,
                    "上行PRB(%)": round(prb_ul, 1) if prb_ul else 0,
                })
                nr_avg_dl += dl
                nr_avg_ul += ul
                nr_avg_prb_dl += prb_dl
                nr_avg_prb_ul += prb_ul
                nr_count += 1

        if nr_count > 0:
            nr_avg_dl /= nr_count
            nr_avg_ul /= nr_count
            nr_avg_prb_dl /= nr_count
            nr_avg_prb_ul /= nr_count

        # Chart data for this operator/month
        chart_data.append({
            "月份": data_month,
            "LTE下行": round(lte_avg_dl, 2),
            "LTE上行": round(lte_avg_ul, 2),
            "NR下行": round(nr_avg_dl, 2),
            "NR上行": round(nr_avg_ul, 2),
        })

        # Build toggle JSON
        toggle_obj = {
            "title": f"{op_name} 网络指标",
            "subtitle": region,
            "dataMonth": data_month,
            "summary": {
                "avgDlRate": round((lte_avg_dl * lte_count + nr_avg_dl * nr_count) / (lte_count + nr_count), 2) if (lte_count + nr_count) > 0 else 0,
                "avgUlRate": round((lte_avg_ul * lte_count + nr_avg_ul * nr_count) / (lte_count + nr_count), 2) if (lte_count + nr_count) > 0 else 0,
                "avgPrbDl": round((lte_avg_prb_dl * lte_count + nr_avg_prb_dl * nr_count) / (lte_count + nr_count), 1) if (lte_count + nr_count) > 0 else 0,
                "bandCount": lte_count + nr_count
            },
            "table": {
                "columns": table_columns,
                "data": table_data
            },
            "chart": {
                "type": "bar",
                "data": chart_data,
                "keys": ["LTE下行", "LTE上行", "NR下行", "NR上行"],
                "column": "月份"
            }
        }

        # Calculate summary values
        total_count = lte_count + nr_count
        avg_dl_rate = round((lte_avg_dl * lte_count + nr_avg_dl * nr_count) / total_count, 2) if total_count > 0 else 0
        avg_ul_rate = round((lte_avg_ul * lte_count + nr_avg_ul * nr_count) / total_count, 2) if total_count > 0 else 0
        avg_prb_dl = round((lte_avg_prb_dl * lte_count + nr_avg_prb_dl * nr_count) / total_count, 1) if total_count > 0 else 0

        # Use simple key-value format instead of JSON to avoid escaping issues
        # Format: [key::value] with pipe/semicolon separators
        table_data_str = ";".join([f"{r['月份']}|{r['制式']}|{r['频段']}|{r['下行速率(Mbps)']}|{r['上行速率(Mbps)']}|{r['下行PRB(%)']}|{r['上行PRB(%)']}" for r in table_data]) if table_data else ""
        chart_data_str = ";".join([f"{c['月份']},{c['LTE下行']},{c['LTE上行']},{c['NR下行']},{c['NR上行']}" for c in chart_data]) if chart_data else ""
        chart_keys_list = ["LTE下行", "LTE上行", "NR下行", "NR上行"]

        toggle_block = f"""[toggle]
[type::indicator]
[title::{op_name} 网络指标]
[subtitle::{region}]
[dataMonth::{data_month}]
[summary::avgDlRate={avg_dl_rate};avgUlRate={avg_ul_rate};avgPrbDl={avg_prb_dl};bandCount={total_count}]
[table_columns::{",".join(table_columns)}]
[table_data::{table_data_str}]
[chart_keys::{",".join(chart_keys_list)}]
[chart_data::{chart_data_str}]
[/toggle]"""
        toggle_blocks.append(toggle_block)

    # Build summary header
    content_parts = [f"# 网络指标数据 (最新月份: {latest_month})\n"]

    return {
        "content": "\n\n".join(content_parts) + "\n\n".join(toggle_blocks),
        "chart": None
    }


def format_site_data(site_cells: list, operators: list, latest_only: bool = False) -> str:
    """Format site cell data into markdown table format (legacy)."""
    result = format_site_data_with_chart(site_cells, operators, latest_only)
    return result["content"]


# ==================== 18 Functions Data Transformation Utilities ====================

# Band definitions for SiteCellSummary (站点/小区数据)
SITE_CELL_BANDS = [
    ("LTE 700M", "lte700MSite", "lte700MCell", "lte700M"),
    ("LTE 800M", "lte800MSite", "lte800MCell", "lte800M"),
    ("LTE 900M", "lte900MSite", "lte900MCell", "lte900M"),
    ("LTE 1400M", "lte1400MSite", "lte1400MCell", "lte1400M"),
    ("LTE 1800M", "lte1800MSite", "lte1800MCell", "lte1800M"),
    ("LTE 2100M", "lte2100MSite", "lte2100MCell", "lte2100M"),
    ("LTE 2600M", "lte2600MSite", "lte2600MCell", "lte2600M"),
    ("NR 700M", "nr700MSite", "nr700MCell", "nr700M"),
    ("NR 800M", "nr800MSite", "nr800MCell", "nr800M"),
    ("NR 900M", "nr900MSite", "nr900MCell", "nr900M"),
    ("NR 1400M", "nr1400MSite", "nr1400MCell", "nr1400M"),
    ("NR 1800M", "nr1800MSite", "nr1800MCell", "nr1800M"),
    ("NR 2100M", "nr2100MSite", "nr2100MCell", "nr2100M"),
    ("NR 2600M", "nr2600MSite", "nr2600MCell", "nr2600M"),
    ("NR 3500M", "nr3500MSite", "nr3500MCell", "nr3500M"),
    ("NR 4900M", "nr4900MSite", "nr4900MCell", "nr4900M"),
    ("NR 2300M", "nr2300MSite", "nr2300MCell", "nr2300M"),
]

# Band definitions for IndicatorInfo (速率/PRB数据)
INDICATOR_BANDS = [
    ("LTE 700M", "lte700M", "lte700MDlRate", "lte700MUlRate", "lte700MDlPrb", "lte700MUlPrb"),
    ("LTE 800M", "lte800M", "lte800MDlRate", "lte800MUlRate", "lte800MDlPrb", "lte800MUlPrb"),
    ("LTE 900M", "lte900M", "lte900MDlRate", "lte900MUlRate", "lte900MDlPrb", "lte900MUlPrb"),
    ("LTE 1400M", "lte1400M", "lte1400MDlRate", "lte1400MUlRate", "lte1400MDlPrb", "lte1400MUlPrb"),
    ("LTE 1800M", "lte1800M", "lte1800MDlRate", "lte1800MUlRate", "lte1800MDlPrb", "lte1800MUlPrb"),
    ("LTE 2100M", "lte2100M", "lte2100MDlRate", "lte2100MUlRate", "lte2100MDlPrb", "lte2100MUlPrb"),
    ("LTE 2600M", "lte2600M", "lte2600MDlRate", "lte2600MUlRate", "lte2600MDlPrb", "lte2600MUlPrb"),
    ("NR 700M", "nr700M", "nr700MDlRate", "nr700MUlRate", "nr700MDlPrb", "nr700MUlPrb"),
    ("NR 800M", "nr800M", "nr800MDlRate", "nr800MUlRate", "nr800MDlPrb", "nr800MUlPrb"),
    ("NR 900M", "nr900M", "nr900MDlRate", "nr900MUlRate", "nr900MDlPrb", "nr900MUlPrb"),
    ("NR 1400M", "nr1400M", "nr1400MDlRate", "nr1400MUlRate", "nr1400MDlPrb", "nr1400MUlPrb"),
    ("NR 1800M", "nr1800M", "nr1800MDlRate", "nr1800MUlRate", "nr1800MDlPrb", "nr1800MUlPrb"),
    ("NR 2100M", "nr2100M", "nr2100MDlRate", "nr2100MUlRate", "nr2100MDlPrb", "nr2100MUlPrb"),
    ("NR 2600M", "nr2600M", "nr2600MDlRate", "nr2600MUlRate", "nr2600MDlPrb", "nr2600MUlPrb"),
    ("NR 3500M", "nr3500M", "nr3500MDlRate", "nr3500MUlRate", "nr3500MDlPrb", "nr3500MUlPrb"),
    ("NR 4900M", "nr4900M", "nr4900MDlRate", "nr4900MUlRate", "nr4900MDlPrb", "nr4900MUlPrb"),
    ("NR 2300M", "nr2300M", "nr2300MDlRate", "nr2300MUlRate", "nr2300MDlPrb", "nr2300MUlPrb"),
]

LTE_BANDS_INDICATOR = [b for b in INDICATOR_BANDS if b[0].startswith("LTE")]
NR_BANDS_INDICATOR = [b for b in INDICATOR_BANDS if b[0].startswith("NR")]


def _get_operator_map(operators: list) -> dict:
    """Build operator ID to name/region mapping."""
    operator_map = {}
    for op in operators:
        if isinstance(op, dict):
            operator_map[op.get("id")] = {
                "name": op.get("operatorName", "Unknown"),
                "region": op.get("region", ""),
                "country": op.get("country", ""),
                "networkType": op.get("networkType", ""),
            }
    return operator_map


def _transform_site_cell_to_long(site_cells: list, data_key: str = "sites") -> list:
    """
    Transform pivot site/cell data to long format for charts.

    Args:
        site_cells: List of SiteCellSummary pivot records
        data_key: "sites" or "cells"

    Returns:
        List of records in long format with fields:
        operator_id, operator_name, data_month, band, technology, value
    """
    result = []
    for sc in site_cells:
        if not isinstance(sc, dict):
            continue
        op_id = sc.get("operatorId")
        data_month = sc.get("dataMonth", "")

        for band_name, site_key, cell_key, band_prefix in SITE_CELL_BANDS:
            tech = "LTE" if band_name.startswith("LTE") else "NR"
            value = sc.get(site_key if data_key == "sites" else cell_key, 0) or 0
            result.append({
                "operatorId": op_id,
                "dataMonth": data_month,
                "band": band_name,
                "technology": tech,
                "value": value,
            })
    return result


def _transform_indicator_to_long(indicators: list, metric: str = "dl_rate") -> list:
    """
    Transform pivot indicator data to long format for charts.

    Args:
        indicators: List of IndicatorInfo pivot records
        metric: "dl_rate", "ul_rate", "dl_prb", "ul_prb"

    Returns:
        List of records in long format with fields:
        operator_id, operator_name, data_month, band, technology, value
    """
    # Map metric to field index in INDICATOR_BANDS
    metric_map = {
        "dl_rate": 2,   # dl_rate field index
        "ul_rate": 3,   # ul_rate field index
        "dl_prb": 4,    # dl_prb field index
        "ul_prb": 5,    # ul_prb field index
    }
    field_idx = metric_map.get(metric, 2)

    result = []
    for ind in indicators:
        if not isinstance(ind, dict):
            continue
        op_id = ind.get("operatorId")
        data_month = ind.get("dataMonth", "")

        for band_name, band_prefix, dl_rate_key, ul_rate_key, dl_prb_key, ul_prb_key in INDICATOR_BANDS:
            tech = "LTE" if band_name.startswith("LTE") else "NR"
            value = ind.get([dl_rate_key, ul_rate_key, dl_prb_key, ul_prb_key][field_idx], 0) or 0
            result.append({
                "operatorId": op_id,
                "dataMonth": data_month,
                "band": band_name,
                "technology": tech,
                "value": round(value, 2) if value else 0,
            })
    return result


def _build_standard_response(title: str, summary: dict, table_data: list,
                             chart_type: str, chart_keys: list, chart_data: list,
                             table_columns: list, thinking: str = "") -> Dict[str, Any]:
    """
    Build a standardized response for all 18 functions.

    Returns dict with:
    - content: Markdown formatted text
    - chart: Chart data for frontend visualization
    - data: Raw data for debugging
    """
    # Build table data string
    if table_columns and table_data:
        col_str = "|".join(table_columns)
        sep_str = "|".join(["---"] * len(table_columns))
        rows = [f"| {' | '.join(str(row.get(c, '')) for c in table_columns)} |" for row in table_data]
        table_md = f"| {col_str} |\n| {sep_str} |\n" + "\n".join(rows)
    else:
        table_md = ""

    # Build chart data string for frontend
    chart_data_str = ";".join([",".join(str(v) for v in row.values()) for row in chart_data]) if chart_data else ""
    chart_keys_str = ",".join(chart_keys) if chart_keys else ""

    # Build summary string
    summary_parts = [f"**{k}**: {v:,}" if isinstance(v, (int, float)) else f"**{k}**: {v}"
                     for k, v in summary.items()]
    summary_str = " | ".join(summary_parts)

    # Build toggle block with standardized format
    toggle_block = f"""[toggle]
[type::data]
[title::{title}]
[summary::{summary_str}]
[table_columns::{",".join(table_columns) if table_columns else ""}]
[table_data::{";".join([",".join(str(v) for v in row.values()) for row in table_data]) if table_data else ""}]
[chart_type::{chart_type}]
[chart_keys::{chart_keys_str}]
[chart_data::{chart_data_str}]
[/toggle]"""

    content = f"# {title}\n\n"
    if summary_str:
        content += f"{summary_str}\n\n"
    if table_md:
        content += table_md + "\n\n"
    content += toggle_block

    return {
        "content": (thinking + "\n\n" + content) if thinking else content,
        "chart": {
            "type": chart_type,
            "keys": chart_keys,
            "data": chart_data,
            "column": table_columns[0] if table_columns else "月份",
        } if chart_data else None,
        "data": {
            "summary": summary,
            "table": table_data,
        }
    }


# ==================== Function 1: Operator Site Count (Latest) ====================
def format_operator_site_count(site_cells: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能1: 中国联通有多少站点，返回最新的日期的各个频段站点信息
    """
    if not site_cells:
        return {"content": "未找到站点数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Get latest month
    months = sorted(set(sc.get("dataMonth", "") for sc in site_cells if isinstance(sc, dict)), reverse=True)
    latest_month = months[0] if months else ""

    # Filter by latest month and operator
    filtered = []
    for sc in site_cells:
        if not isinstance(sc, dict):
            continue
        if sc.get("dataMonth") != latest_month:
            continue
        if operator_name:
            op_id = sc.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(sc)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的站点数据", "chart": None, "data": None}

    # Build long format data
    long_data = _transform_site_cell_to_long(filtered, "sites")

    # Filter non-zero values
    long_data = [d for d in long_data if d["value"] > 0]

    # Group by operator
    op_groups = {}
    for d in long_data:
        key = d["operatorId"]
        if key not in op_groups:
            op_groups[key] = []
        op_groups[key].append(d)

    # Build summary and table
    table_columns = ["运营商", "制式", "频段", "站点数"]
    table_data = []
    chart_data = []
    total_sites = 0

    for op_id, records in op_groups.items():
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        # Group by technology
        lte_total = sum(d["value"] for d in records if d["technology"] == "LTE")
        nr_total = sum(d["value"] for d in records if d["technology"] == "NR")

        for d in records:
            table_data.append({
                "运营商": op_name,
                "制式": d["technology"],
                "频段": d["band"],
                "站点数": d["value"],
            })
            total_sites += d["value"]

        chart_data.append({
            "运营商": op_name,
            "LTE站点": lte_total,
            "NR站点": nr_total,
            "总站点": lte_total + nr_total,
        })

    summary = {
        "运营商数": len(op_groups),
        "总站点数": total_sites,
        "数据月份": latest_month,
    }

    thinking = _build_thinking_chain("", "site_count - 站点数量查询", operator_name, "站点数据")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} 站点数量统计",
        summary=summary,
        table_data=table_data,
        chart_type="bar",
        chart_keys=["LTE站点", "NR站点", "总站点"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Function 2: Operator Cell Count (Latest) ====================
def format_operator_cell_count(site_cells: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能2: 中国联通有多少小区，返回最新的日期的各个频段小区信息
    """
    if not site_cells:
        return {"content": "未找到小区数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Get latest month
    months = sorted(set(sc.get("dataMonth", "") for sc in site_cells if isinstance(sc, dict)), reverse=True)
    latest_month = months[0] if months else ""

    # Filter by latest month and operator
    filtered = []
    for sc in site_cells:
        if not isinstance(sc, dict):
            continue
        if sc.get("dataMonth") != latest_month:
            continue
        if operator_name:
            op_id = sc.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(sc)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的小区数据", "chart": None, "data": None}

    # Build long format data
    long_data = _transform_site_cell_to_long(filtered, "cells")

    # Filter non-zero values
    long_data = [d for d in long_data if d["value"] > 0]

    # Group by operator
    op_groups = {}
    for d in long_data:
        key = d["operatorId"]
        if key not in op_groups:
            op_groups[key] = []
        op_groups[key].append(d)

    # Build summary and table
    table_columns = ["运营商", "制式", "频段", "小区数"]
    table_data = []
    chart_data = []
    total_cells = 0

    for op_id, records in op_groups.items():
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        lte_total = sum(d["value"] for d in records if d["technology"] == "LTE")
        nr_total = sum(d["value"] for d in records if d["technology"] == "NR")

        for d in records:
            table_data.append({
                "运营商": op_name,
                "制式": d["technology"],
                "频段": d["band"],
                "小区数": d["value"],
            })
            total_cells += d["value"]

        chart_data.append({
            "运营商": op_name,
            "LTE小区": lte_total,
            "NR小区": nr_total,
            "总小区": lte_total + nr_total,
        })

    summary = {
        "运营商数": len(op_groups),
        "总小区数": total_cells,
        "数据月份": latest_month,
    }

    thinking = _build_thinking_chain("", "cell_count - 小区数量查询", operator_name, "小区数据")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} 小区数量统计",
        summary=summary,
        table_data=table_data,
        chart_type="bar",
        chart_keys=["LTE小区", "NR小区", "总小区"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Function 3: UL PRB (Latest) ====================
def format_ul_prb(indicators: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能3: 中国联通小区上行负载，返回最新的日期的各个频段小区ULPRB利用率
    """
    return _format_indicator_metric(indicators, operators, "ul_prb", "上行负载(UL PRB)", operator_name)


# ==================== Function 4: DL PRB (Latest) ====================
def format_dl_prb(indicators: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能4: 中国联通小区下行负载，返回最新的日期的各个频段小区DLPRB利用率
    """
    return _format_indicator_metric(indicators, operators, "dl_prb", "下行负载(DL PRB)", operator_name)


# ==================== Function 5: UL Rate (Latest) ====================
def format_ul_rate(indicators: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能5: 中国联通小区上行速率，返回最新的日期的各个频段小区ULUserRate
    """
    return _format_indicator_metric(indicators, operators, "ul_rate", "上行速率(Mbps)", operator_name)


# ==================== Function 6: DL Rate (Latest) ====================
def format_dl_rate(indicators: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能6: 中国联通小区下行速率，返回最新的日期的各个频段小区DLUserRate
    """
    return _format_indicator_metric(indicators, operators, "dl_rate", "下行速率(Mbps)", operator_name)


def _format_indicator_metric(indicators: list, operators: list, metric: str,
                             metric_name: str, operator_name: str = None) -> Dict[str, Any]:
    """
    Generic function to format indicator metrics (DL/UL rate, DL/UL PRB).
    """
    if not indicators:
        return {"content": "未找到指标数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Get latest month
    months = sorted(set(ind.get("dataMonth", "") for ind in indicators if isinstance(ind, dict)), reverse=True)
    latest_month = months[0] if months else ""

    # Filter by latest month and operator
    filtered = []
    for ind in indicators:
        if not isinstance(ind, dict):
            continue
        if ind.get("dataMonth") != latest_month:
            continue
        if operator_name:
            op_id = ind.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(ind)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的指标数据", "chart": None, "data": None}

    # Transform to long format
    long_data = _transform_indicator_to_long(filtered, metric)

    # Filter non-zero values
    long_data = [d for d in long_data if d["value"] > 0]

    # Group by operator
    op_groups = {}
    for d in long_data:
        key = d["operatorId"]
        if key not in op_groups:
            op_groups[key] = []
        op_groups[key].append(d)

    # Build summary and table
    table_columns = ["运营商", "制式", "频段", metric_name]
    table_data = []
    chart_data = []

    metric_unit = "%" if "PRB" in metric_name else "Mbps"

    for op_id, records in op_groups.items():
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        lte_vals = [d["value"] for d in records if d["technology"] == "LTE"]
        nr_vals = [d["value"] for d in records if d["technology"] == "NR"]
        lte_avg = sum(lte_vals) / len(lte_vals) if lte_vals else 0
        nr_avg = sum(nr_vals) / len(nr_vals) if nr_vals else 0

        for d in records:
            table_data.append({
                "运营商": op_name,
                "制式": d["technology"],
                "频段": d["band"],
                metric_name: f"{d['value']:.2f}{metric_unit}",
            })

        chart_data.append({
            "运营商": op_name,
            "LTE": round(lte_avg, 2),
            "NR": round(nr_avg, 2),
            "平均": round((lte_avg + nr_avg) / 2, 2) if (lte_vals or nr_vals) else 0,
        })

    summary = {
        "运营商数": len(op_groups),
        "数据月份": latest_month,
        "指标": metric_name,
    }

    thinking = _build_thinking_chain("", f"{metric} - {metric_name}查询", operator_name, "网络指标")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} {metric_name}统计",
        summary=summary,
        table_data=table_data,
        chart_type="bar",
        chart_keys=["LTE", "NR", "平均"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Function 7: Traffic Ratio (Latest) ====================
def format_traffic_ratio(indicators: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能7: 中国联通小区分流/指标，返回最新的日期的分流比，时长驻留比、流量驻留比
    """
    if not indicators:
        return {"content": "未找到指标数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Get latest month
    months = sorted(set(ind.get("dataMonth", "") for ind in indicators if isinstance(ind, dict)), reverse=True)
    latest_month = months[0] if months else ""

    # Filter by latest month and operator
    filtered = []
    for ind in indicators:
        if not isinstance(ind, dict):
            continue
        if ind.get("dataMonth") != latest_month:
            continue
        if operator_name:
            op_id = ind.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(ind)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的指标数据", "chart": None, "data": None}

    # Extract traffic ratio fields
    table_columns = ["运营商", "分流比", "时长驻留比", "流量驻留比", "终端渗透率"]
    table_data = []
    chart_data = []

    for ind in filtered:
        if not isinstance(ind, dict):
            continue
        op_id = ind.get("operatorId")
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        traffic_ratio = ind.get("trafficRatio") or 0
        duration_ratio = ind.get("durationCampratio") or 0
        traffic_camp_ratio = ind.get("trafficCampratio") or 0
        terminal_pen = ind.get("terminalPenetration") or 0

        table_data.append({
            "运营商": op_name,
            "分流比": f"{traffic_ratio:.2f}%",
            "时长驻留比": f"{duration_ratio:.2f}%",
            "流量驻留比": f"{traffic_camp_ratio:.2f}%",
            "终端渗透率": f"{terminal_pen:.2f}%",
        })

        chart_data.append({
            "运营商": op_name,
            "分流比": round(traffic_ratio, 2),
            "时长驻留比": round(duration_ratio, 2),
            "流量驻留比": round(traffic_camp_ratio, 2),
            "终端渗透率": round(terminal_pen, 2),
        })

    summary = {
        "运营商数": len(filtered),
        "数据月份": latest_month,
    }

    thinking = _build_thinking_chain("", "traffic_ratio - 分流指标查询", operator_name, "分流指标")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} 分流指标统计",
        summary=summary,
        table_data=table_data,
        chart_type="bar",
        chart_keys=["分流比", "时长驻留比", "流量驻留比", "终端渗透率"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Function 9: All Operators List ====================
def format_all_operators(operators: list) -> Dict[str, Any]:
    """
    功能9: 查看所有运营商，返回所有运营商信息
    """
    if not operators:
        return {"content": "未找到运营商数据", "chart": None, "data": None}

    table_columns = ["运营商名称", "国家", "区域", "网络类型"]
    table_data = []

    for op in operators:
        if not isinstance(op, dict):
            continue
        table_data.append({
            "运营商名称": op.get("operatorName", ""),
            "国家": op.get("country", ""),
            "区域": op.get("region", ""),
            "网络类型": op.get("networkType", ""),
        })

    summary = {"运营商总数": len(table_data)}

    thinking = _build_thinking_chain("", "operator_list - 运营商列表查询", None, "运营商信息")

    return _build_standard_response(
        title="运营商列表",
        summary=summary,
        table_data=table_data,
        chart_type="none",
        chart_keys=[],
        chart_data=[],
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Function 10: All Operators Sites (Latest) ====================
def format_all_operators_sites(site_cells: list, operators: list) -> Dict[str, Any]:
    """
    功能10: 查看所有运营商站点，返回所有运营商最新日期的站点信息
    """
    if not site_cells:
        return {"content": "未找到站点数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Get latest month
    months = sorted(set(sc.get("dataMonth", "") for sc in site_cells if isinstance(sc, dict)), reverse=True)
    latest_month = months[0] if months else ""

    # Filter by latest month
    filtered = [sc for sc in site_cells if isinstance(sc, dict) and sc.get("dataMonth") == latest_month]

    if not filtered:
        return {"content": "未找到站点数据", "chart": None, "data": None}

    # Transform to long format
    long_data = _transform_site_cell_to_long(filtered, "sites")
    long_data = [d for d in long_data if d["value"] > 0]

    # Group by operator
    op_groups = {}
    for d in long_data:
        key = d["operatorId"]
        if key not in op_groups:
            op_groups[key] = []
        op_groups[key].append(d)

    # Build summary and table
    table_columns = ["运营商", "制式", "频段", "站点数"]
    table_data = []
    chart_data = []

    for op_id, records in op_groups.items():
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        lte_total = sum(d["value"] for d in records if d["technology"] == "LTE")
        nr_total = sum(d["value"] for d in records if d["technology"] == "NR")

        for d in records:
            table_data.append({
                "运营商": op_name,
                "制式": d["technology"],
                "频段": d["band"],
                "站点数": d["value"],
            })

        chart_data.append({
            "运营商": op_name,
            "LTE站点": lte_total,
            "NR站点": nr_total,
            "总站点": lte_total + nr_total,
        })

    total_sites = sum(d["value"] for d in long_data)
    summary = {
        "运营商数": len(op_groups),
        "总站点数": total_sites,
        "数据月份": latest_month,
    }

    thinking = _build_thinking_chain("", "all_sites - 所有运营商站点查询", None, "站点数据")

    return _build_standard_response(
        title="所有运营商站点统计",
        summary=summary,
        table_data=table_data,
        chart_type="bar",
        chart_keys=["LTE站点", "NR站点", "总站点"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Functions 11: All Operators DL/UL Rate ====================
def format_all_operators_dl_rate(indicators: list, operators: list) -> Dict[str, Any]:
    """
    功能11: 查看所有运营商下行速率，返回所有运营商最新日期的LTE和NR的dl_avg的速率
    """
    return _format_all_operators_rate(indicators, operators, "dl_rate", "下行速率")


def format_all_operators_ul_rate(indicators: list, operators: list) -> Dict[str, Any]:
    """
    功能11: 查看所有运营商上行速率，返回所有运营商最新日期的LTE和NR的ul_avg的速率
    """
    return _format_all_operators_rate(indicators, operators, "ul_rate", "上行速率")


def _format_all_operators_rate(indicators: list, operators: list, metric: str, metric_name: str) -> Dict[str, Any]:
    """
    Generic function for all operators DL/UL rate.
    """
    if not indicators:
        return {"content": "未找到指标数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Get latest month
    months = sorted(set(ind.get("dataMonth", "") for ind in indicators if isinstance(ind, dict)), reverse=True)
    latest_month = months[0] if months else ""

    # Filter by latest month
    filtered = [ind for ind in indicators if isinstance(ind, dict) and ind.get("dataMonth") == latest_month]

    if not filtered:
        return {"content": "未找到指标数据", "chart": None, "data": None}

    # Calculate per-operator LTE/NR averages for the metric
    table_columns = ["运营商", "LTE平均下行速率(Mbps)", "NR平均下行速率(Mbps)", "整体平均(Mbps)"]
    if metric == "ul_rate":
        table_columns = ["运营商", "LTE平均上行速率(Mbps)", "NR平均上行速率(Mbps)", "整体平均(Mbps)"]

    table_data = []
    chart_data = []

    for ind in filtered:
        if not isinstance(ind, dict):
            continue
        op_id = ind.get("operatorId")
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        # Calculate LTE avg
        lte_vals = []
        for band_name, band_prefix, dl_rate_key, ul_rate_key, dl_prb_key, ul_prb_key in LTE_BANDS_INDICATOR:
            val = ind.get([dl_rate_key, ul_rate_key][0 if metric == "dl_rate" else 1], 0) or 0
            if val > 0:
                lte_vals.append(val)
        lte_avg = sum(lte_vals) / len(lte_vals) if lte_vals else 0

        # Calculate NR avg
        nr_vals = []
        for band_name, band_prefix, dl_rate_key, ul_rate_key, dl_prb_key, ul_prb_key in NR_BANDS_INDICATOR:
            val = ind.get([dl_rate_key, ul_rate_key][0 if metric == "dl_rate" else 1], 0) or 0
            if val > 0:
                nr_vals.append(val)
        nr_avg = sum(nr_vals) / len(nr_vals) if nr_vals else 0

        overall_avg = (lte_avg * len(lte_vals) + nr_avg * len(nr_vals)) / (len(lte_vals) + len(nr_vals)) if (lte_vals or nr_vals) else 0

        table_data.append({
            "运营商": op_name,
            "LTE平均下行速率(Mbps)" if metric == "dl_rate" else "LTE平均上行速率(Mbps)": round(lte_avg, 2),
            "NR平均下行速率(Mbps)" if metric == "dl_rate" else "NR平均上行速率(Mbps)": round(nr_avg, 2),
            "整体平均(Mbps)": round(overall_avg, 2),
        })

        chart_data.append({
            "运营商": op_name,
            "LTE": round(lte_avg, 2),
            "NR": round(nr_avg, 2),
            "平均": round(overall_avg, 2),
        })

    summary = {
        "运营商数": len(filtered),
        "数据月份": latest_month,
        "指标": metric_name,
    }

    thinking = _build_thinking_chain("", f"all_{metric} - 所有运营商{metric_name}查询", None, "网络指标")

    return _build_standard_response(
        title=f"所有运营商{metric_name}统计",
        summary=summary,
        table_data=table_data,
        chart_type="bar",
        chart_keys=["LTE", "NR", "平均"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Functions 12-18: History Functions ====================
def format_site_history(site_cells: list, operators: list, operator_name: str = None, data_type: str = "sites") -> Dict[str, Any]:
    """
    功能12: 中国联通历史/所有站点，返回所有日期的各个频段站点信息
    功能13: 中国联通历史/所有小区，返回所有日期的各个频段小区信息
    """
    if not site_cells:
        return {"content": "未找到历史数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Filter by operator if specified
    filtered = []
    for sc in site_cells:
        if not isinstance(sc, dict):
            continue
        if operator_name:
            op_id = sc.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(sc)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的历史数据", "chart": None, "data": None}

    # Get all months sorted
    months = sorted(set(sc.get("dataMonth", "") for sc in filtered if isinstance(sc, dict)), reverse=True)

    # Transform to long format
    long_data = _transform_site_cell_to_long(filtered, data_type)
    long_data = [d for d in long_data if d["value"] > 0]

    # Group by operator and month
    op_month_groups = {}
    for d in long_data:
        key = (d["operatorId"], d["dataMonth"])
        if key not in op_month_groups:
            op_month_groups[key] = []
        op_month_groups[key].append(d)

    # Build summary and table
    data_type_name = "站点" if data_type == "sites" else "小区"
    table_columns = ["月份", "运营商", "制式", "频段", f"{data_type_name}数"]
    table_data = []
    chart_data = []

    for (op_id, month), records in sorted(op_month_groups.items(), key=lambda x: x[0][1], reverse=True):
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        lte_total = sum(d["value"] for d in records if d["technology"] == "LTE")
        nr_total = sum(d["value"] for d in records if d["technology"] == "NR")

        for d in records:
            table_data.append({
                "月份": month,
                "运营商": op_name,
                "制式": d["technology"],
                "频段": d["band"],
                f"{data_type_name}数": d["value"],
            })

        chart_data.append({
            "月份": month,
            "运营商": op_name,
            "LTE": lte_total,
            "NR": nr_total,
            "合计": lte_total + nr_total,
        })

    summary = {
        "运营商数": len(set(k[0] for k in op_month_groups.keys())),
        "月份数": len(months),
        "数据类型": data_type_name,
    }

    thinking = _build_thinking_chain("", f"site_history - {data_type_name}历史查询", operator_name, "历史数据")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} {data_type_name}历史数据",
        summary=summary,
        table_data=table_data,
        chart_type="line",
        chart_keys=["LTE", "NR", "合计"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


def format_indicator_history(indicators: list, operators: list, metric: str, operator_name: str = None) -> Dict[str, Any]:
    """
    功能14: 中国联通历史/所有小区上行负载
    功能15: 中国联通历史/所有小区下行负载
    功能16: 中国联通历史/所有小区上行速率
    功能17: 中国联通历史/所有小区下行速率
    """
    if not indicators:
        return {"content": "未找到历史数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Filter by operator if specified
    filtered = []
    for ind in indicators:
        if not isinstance(ind, dict):
            continue
        if operator_name:
            op_id = ind.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(ind)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的历史数据", "chart": None, "data": None}

    # Get all months sorted
    months = sorted(set(ind.get("dataMonth", "") for ind in filtered if isinstance(ind, dict)), reverse=True)

    # Transform to long format
    long_data = _transform_indicator_to_long(filtered, metric)
    long_data = [d for d in long_data if d["value"] > 0]

    # Group by operator and month
    op_month_groups = {}
    for d in long_data:
        key = (d["operatorId"], d["dataMonth"])
        if key not in op_month_groups:
            op_month_groups[key] = []
        op_month_groups[key].append(d)

    # Metric display names
    metric_names = {
        "dl_prb": "下行负载(DL PRB)",
        "ul_prb": "上行负载(UL PRB)",
        "dl_rate": "下行速率",
        "ul_rate": "上行速率",
    }
    metric_name = metric_names.get(metric, metric)
    metric_unit = "%" if "PRB" in metric_name else "Mbps"

    # Build summary and table
    table_columns = ["月份", "运营商", "制式", "频段", metric_name]
    table_data = []
    chart_data = []

    for (op_id, month), records in sorted(op_month_groups.items(), key=lambda x: x[0][1], reverse=True):
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]

        lte_vals = [d["value"] for d in records if d["technology"] == "LTE"]
        nr_vals = [d["value"] for d in records if d["technology"] == "NR"]
        lte_avg = sum(lte_vals) / len(lte_vals) if lte_vals else 0
        nr_avg = sum(nr_vals) / len(nr_vals) if nr_vals else 0

        for d in records:
            table_data.append({
                "月份": month,
                "运营商": op_name,
                "制式": d["technology"],
                "频段": d["band"],
                metric_name: f"{d['value']:.2f}{metric_unit}",
            })

        chart_data.append({
            "月份": month,
            "运营商": op_name,
            "LTE": round(lte_avg, 2),
            "NR": round(nr_avg, 2),
        })

    summary = {
        "运营商数": len(set(k[0] for k in op_month_groups.keys())),
        "月份数": len(months),
        "指标": metric_name,
    }

    thinking = _build_thinking_chain("", f"{metric}_history - {metric_name}历史查询", operator_name, "历史指标")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} {metric_name}历史数据",
        summary=summary,
        table_data=table_data,
        chart_type="line",
        chart_keys=["LTE", "NR"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


# ==================== Function 18: Traffic Ratio History ====================
def format_traffic_ratio_history(indicators: list, operators: list, operator_name: str = None) -> Dict[str, Any]:
    """
    功能18: 中国联通历史/所有小区分流/指标，返回所有日期的分流比，时长驻留比、流量驻留比
    """
    if not indicators:
        return {"content": "未找到历史数据", "chart": None, "data": None}

    operator_map = _get_operator_map(operators)

    # Filter by operator if specified
    filtered = []
    for ind in indicators:
        if not isinstance(ind, dict):
            continue
        if operator_name:
            op_id = ind.get("operatorId")
            op_info = operator_map.get(op_id, {})
            if operator_name not in op_info.get("name", "") and op_info.get("name", "") not in operator_name:
                continue
        filtered.append(ind)

    if not filtered:
        return {"content": f"未找到运营商 {operator_name} 的历史数据", "chart": None, "data": None}

    # Sort by month
    sorted_data = sorted(filtered, key=lambda x: x.get("dataMonth", ""), reverse=True)

    table_columns = ["月份", "运营商", "分流比", "时长驻留比", "流量驻留比", "终端渗透率"]
    table_data = []
    chart_data = []

    for ind in sorted_data:
        if not isinstance(ind, dict):
            continue
        op_id = ind.get("operatorId")
        op_info = operator_map.get(op_id, {"name": f"运营商{op_id}"})
        op_name = op_info["name"]
        month = ind.get("dataMonth", "")

        traffic_ratio = ind.get("trafficRatio") or 0
        duration_ratio = ind.get("durationCampratio") or 0
        traffic_camp_ratio = ind.get("trafficCampratio") or 0
        terminal_pen = ind.get("terminalPenetration") or 0

        table_data.append({
            "月份": month,
            "运营商": op_name,
            "分流比": f"{traffic_ratio:.2f}%",
            "时长驻留比": f"{duration_ratio:.2f}%",
            "流量驻留比": f"{traffic_camp_ratio:.2f}%",
            "终端渗透率": f"{terminal_pen:.2f}%",
        })

        chart_data.append({
            "月份": month,
            "运营商": op_name,
            "分流比": round(traffic_ratio, 2),
            "时长驻留比": round(duration_ratio, 2),
            "流量驻留比": round(traffic_camp_ratio, 2),
            "终端渗透率": round(terminal_pen, 2),
        })

    summary = {
        "运营商数": len(set(ind.get("operatorId") for ind in filtered if isinstance(ind, dict))),
        "记录数": len(sorted_data),
    }

    thinking = _build_thinking_chain("", "traffic_ratio_history - 分流指标历史查询", operator_name, "历史指标")

    return _build_standard_response(
        title=f"{operator_name or '所有运营商'} 分流指标历史数据",
        summary=summary,
        table_data=table_data,
        chart_type="line",
        chart_keys=["分流比", "时长驻留比", "流量驻留比", "终端渗透率"],
        chart_data=chart_data,
        table_columns=table_columns,
        thinking=thinking,
    )


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
                # Stream content in larger chunks for better performance
                content = result["content"]
                for i in range(0, len(content), 200):
                    chunk = content[i:i+200]
                    # Use standard SSE format - content as plain string
                    yield f'data: {json.dumps({"type": "content", "content": chunk})}\n\n'
                    await asyncio.sleep(0.01)  # Small delay for streaming effect
                # Send chart data if available
                if result.get("chart"):
                    yield f'data: {json.dumps({"type": "chart", "chart": result["chart"]})}\n\n'
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


def _detect_data_category(user_input: str) -> str:
    """
    Detect the data category from user input for routing to appropriate formatter.
    Categories: site, cell, ul_prb, dl_prb, ul_rate, dl_rate, traffic_ratio, history
    """
    text = user_input.lower()

    # Check for history keywords
    is_history = any(kw in text for kw in ['历史', '所有', '历年', '变化', '趋势'])

    # Check for specific metric keywords
    if '上行负载' in user_input or 'ulprb' in text or '上行prb' in text:
        metric = 'ul_prb'
    elif '下行负载' in user_input or 'dlprb' in text or '下行prb' in text:
        metric = 'dl_prb'
    elif '上行速率' in user_input or 'ulrate' in text or '上行速度' in text:
        metric = 'ul_rate'
    elif '下行速率' in user_input or 'dlrate' in text or '下行速度' in text:
        metric = 'dl_rate'
    elif '分流' in user_input or '驻留' in user_input or '流量比' in text:
        metric = 'traffic_ratio'
    elif '站点' in user_input:
        metric = 'sites'
    elif '小区' in user_input:
        metric = 'cells'
    else:
        metric = 'unknown'

    return metric, is_history


async def _process_agent_request(user_input: str, confirmed: bool = False, locale: str = "zh") -> Dict[str, Any]:
    """
    Shared logic for processing agent requests.
    Routes to appropriate formatter based on intent and data category.
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

        # Detect data category from user input
        data_category, is_history = _detect_data_category(user_input)

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

        # Helper to get site cells data
        async def get_site_cells_data(op_name: str = None):
            if op_name:
                result = await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint=f"/operators/{op_name}/sites/latest",
                    method="GET",
                )
                if result.get("error"):
                    result = await agent.call_java_service(
                        service_name="nl2sql-service",
                        endpoint="/operators/all/sites/latest",
                        method="GET",
                    )
                return result
            else:
                return await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint="/operators/all/sites/latest",
                    method="GET",
                )

        # Helper to get site cells history
        async def get_site_cells_history(op_name: str = None):
            if op_name:
                return await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint=f"/operators/{op_name}/sites/history",
                    method="GET",
                )
            else:
                return await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint="/site-summary",
                    method="GET",
                )

        # Helper to get indicators data
        async def get_indicators_data(op_name: str = None):
            if op_name:
                result = await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint=f"/operators/{op_name}/indicators/latest",
                    method="GET",
                )
                if result.get("error"):
                    result = await agent.call_java_service(
                        service_name="nl2sql-service",
                        endpoint="/operators/all/indicators/latest",
                        method="GET",
                    )
                return result
            else:
                return await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint="/operators/all/indicators/latest",
                    method="GET",
                )

        # Helper to get indicators history
        async def get_indicators_history(op_name: str = None):
            if op_name:
                return await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint=f"/operators/{op_name}/indicators/history",
                    method="GET",
                )
            else:
                return await agent.call_java_service(
                    service_name="nl2sql-service",
                    endpoint="/operators/all/indicators/latest",
                    method="GET",
                )

        # Route based on intent and data category
        if intent in ["site_data", "latest_data", "indicator_data"]:
            # Determine if this is a site/cell query or indicator query
            if data_category in ['sites', 'cells']:
                # Site/Cell query
                if is_history:
                    # History query - functions 12, 13
                    result = await get_site_cells_history(operator_name)
                else:
                    # Latest query - functions 1, 2, 10
                    result = await get_site_cells_data(operator_name)

                if result.get("error"):
                    return get_error_response(GET_SITE_CELLS_FAILED, locale, result["error"])

                site_cells = result if isinstance(result, list) else result.get("data", [])
                if not isinstance(site_cells, list):
                    site_cells = [site_cells] if site_cells else []

                if data_category == 'sites':
                    if operator_name:
                        return format_operator_site_count(site_cells, operators, operator_name)
                    else:
                        return format_all_operators_sites(site_cells, operators)
                else:  # cells
                    if operator_name:
                        return format_operator_cell_count(site_cells, operators, operator_name)
                    else:
                        # For all operators cells, reuse logic
                        return format_operator_cell_count(site_cells, operators, None)

            elif data_category in ['ul_prb', 'dl_prb', 'ul_rate', 'dl_rate', 'traffic_ratio']:
                # Indicator query
                if is_history:
                    # History query - functions 14, 15, 16, 17, 18
                    result = await get_indicators_history(operator_name)
                    if result.get("error"):
                        return get_error_response(GET_INDICATORS_FAILED, locale, result["error"])

                    indicators = result if isinstance(result, list) else result.get("data", [])
                    if not isinstance(indicators, list):
                        indicators = [indicators] if indicators else []

                    if data_category == 'traffic_ratio':
                        return format_traffic_ratio_history(indicators, operators, operator_name)
                    else:
                        return format_indicator_history(indicators, operators, data_category, operator_name)
                else:
                    # Latest query - functions 3, 4, 5, 6, 7, 11
                    result = await get_indicators_data(operator_name)
                    if result.get("error"):
                        return get_error_response(GET_INDICATORS_FAILED, locale, result["error"])

                    indicators = result if isinstance(result, list) else result.get("data", [])
                    if not isinstance(indicators, list):
                        indicators = [indicators] if indicators else []

                    # For "all operators" rate queries (function 11)
                    if not operator_name and data_category in ['dl_rate', 'ul_rate']:
                        if data_category == 'dl_rate':
                            return format_all_operators_dl_rate(indicators, operators)
                        else:
                            return format_all_operators_ul_rate(indicators, operators)
                    elif data_category == 'ul_prb':
                        return format_ul_prb(indicators, operators, operator_name)
                    elif data_category == 'dl_prb':
                        return format_dl_prb(indicators, operators, operator_name)
                    elif data_category == 'ul_rate':
                        return format_ul_rate(indicators, operators, operator_name)
                    elif data_category == 'dl_rate':
                        return format_dl_rate(indicators, operators, operator_name)
                    elif data_category == 'traffic_ratio':
                        return format_traffic_ratio(indicators, operators, operator_name)
                    else:
                        return format_ul_prb(indicators, operators, operator_name)

        elif intent == "operator_list":
            # Function 9: All operators list
            operators_result = await agent.call_java_service(
                service_name="nl2sql-service",
                endpoint="/operators",
                method="GET",
            )
            if operators_result.get("error"):
                return get_error_response(GET_OPERATORS_FAILED, locale, operators_result["error"])

            operators_data = operators_result.get("data") if isinstance(operators_result, dict) else operators_result
            operators_data = operators_data if isinstance(operators_data, list) else []

            return format_all_operators(operators_data)

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
