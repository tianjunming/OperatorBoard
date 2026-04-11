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

            # Format using industry-standard structured blocks
            items = data[:limit] if isinstance(data, list) else [data]
            chart_result = format_indicator_data_with_chart(items, operators)

            thinking = _build_thinking_chain(user_input, "indicator_data - 指标数据查询", operator_name, "性能指标")
            return {"content": thinking + "\n\n" + chart_result["content"], "chart": chart_result.get("chart")}

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
