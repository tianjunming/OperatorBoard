"""Data Service Tools - Connect Telecom Agent to the Java Microservice"""
import requests
from typing import Optional, Dict, Any, List
from langchain_core.tools import tool

# Default data service URL
DEFAULT_DATA_SERVICE_URL = "http://localhost:8081/api/query"


class TelecomDataServiceClient:
    """Client for the Telecom Data Service API"""

    def __init__(self, base_url: str = DEFAULT_DATA_SERVICE_URL):
        self.base_url = base_url
        self.timeout = 30

    def query(self, query_type: str = None, carrier: str = None,
              band: str = None, min_prb: float = None) -> Dict[str, Any]:
        """Send query to data service"""
        params = {}
        if query_type:
            params["type"] = query_type
        if carrier:
            params["carrier"] = carrier
        if band:
            params["band"] = band
        if min_prb is not None:
            params["minPrb"] = min_prb

        try:
            response = requests.get(self.base_url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            return {"success": False, "message": "无法连接到数据服务，请确保服务已启动 (端口 8081)"}
        except requests.exceptions.Timeout:
            return {"success": False, "message": "数据服务请求超时"}
        except Exception as e:
            return {"success": False, "message": f"请求错误: {str(e)}"}

    def natural_query(self, query: str) -> Dict[str, Any]:
        """Send natural language query"""
        try:
            response = requests.post(
                f"{self.base_url}/natural",
                json={"query": query},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"success": False, "message": f"查询错误: {str(e)}"}

    def get_carriers(self) -> List[Dict]:
        """Get all carriers"""
        result = self.query("carriers")
        if result.get("success"):
            return result.get("data", [])
        return []

    def get_all_data(self) -> Dict:
        """Get all carrier data"""
        return self.query("all")

    def get_statistics(self, carrier: str = None) -> Dict:
        """Get network statistics"""
        return self.query("statistics", carrier=carrier)


# Global client instance
_client = None


def get_telecom_client() -> TelecomDataServiceClient:
    """Get or create the telecom data service client"""
    global _client
    if _client is None:
        _client = TelecomDataServiceClient()
    return _client


def _format_data(data: Any, indent: int = 0) -> str:
    """Format data for display"""
    prefix = "  " * indent

    if isinstance(data, dict):
        lines = []
        skip_keys = {'id', 'createdAt', 'updatedAt', 'carrierId', 'carrierDataId'}
        for key, value in data.items():
            if key in skip_keys:
                continue
            key_name = key.replace('_', ' ')
            if isinstance(value, dict):
                lines.append(f"{prefix}{key_name}:")
                lines.append(_format_data(value, indent + 1))
            elif isinstance(value, list):
                lines.append(f"{prefix}{key_name}: {len(value)} items")
            elif value is None:
                lines.append(f"{prefix}{key_name}: N/A")
            elif isinstance(value, float):
                lines.append(f"{prefix}{key_name}: {value:.2f}")
            else:
                lines.append(f"{prefix}{key_name}: {value}")
        return "\n".join(lines)
    elif isinstance(data, list):
        if not data:
            return "无数据"
        lines = []
        for i, item in enumerate(data[:10]):  # Limit to 10 items
            if isinstance(item, dict):
                lines.append(f"\n[{i+1}] " + _format_data(item, indent))
            else:
                lines.append(f"[{i+1}] {item}")
        if len(data) > 10:
            lines.append(f"\n... 还有 {len(data) - 10} 条数据")
        return "\n".join(lines)
    elif data is None:
        return "N/A"
    else:
        return str(data)


# ==================== LangChain Tools ====================

@tool
def query_telecom_data(query: str) -> str:
    """Query the telecom data service for carrier information, network statistics, and historical data.

    Use this tool when the user asks about:
    - Carrier information (运营商信息)
    - Network data (网络数据)
    - Frequency bands (频段)
    - PRB utilization (PRB利用率)
    - Uplink/downlink rates (上行/下行速率)
    - Historical network data (历史数据)
    - Statistics (统计数据)

    Args:
        query: A natural language query describing what data to retrieve

    Returns:
        Formatted data from the telecom data service
    """
    client = get_telecom_client()
    result = client.natural_query(query)

    if not result.get("success", False):
        return f"❌ 数据服务错误: {result.get('message', '未知错误')}\n\n请确保Java数据服务正在运行 (端口 8081)"

    data = result.get("data", {})
    message = result.get("message", "")

    return f"📊 {message}\n\n{_format_data(data)}"


@tool
def get_carrier_info(carrier_name: str = None) -> str:
    """Get carrier/operator information from the telecom data service.

    Args:
        carrier_name: Optional carrier name or code (e.g., '中国移动', 'CMCC', '中国联通', 'CUCC', '中国电信', 'CTCC')

    Returns:
        Carrier information including name, code, type, and contact
    """
    client = get_telecom_client()
    carriers = client.get_carriers()

    if not carriers:
        return "❌ 未找到运营商信息或数据服务不可用"

    lines = ["🏢 运营商信息\n" + "="*50 + "\n"]

    for c in carriers:
        if carrier_name and carrier_name.lower() not in c.get('name', '').lower() and \
           carrier_name.lower() not in c.get('code', '').lower():
            continue

        lines.append(f"📱 {c.get('name', 'N/A')} ({c.get('code', 'N/A')})")
        lines.append(f"   类型: {c.get('type', 'N/A')}")
        lines.append(f"   联系方式: {c.get('contact', 'N/A')}")
        lines.append("")

    return "\n".join(lines) if lines else "❌ 未找到指定运营商"


@tool
def get_network_stats(carrier: str = None) -> str:
    """Get network performance statistics from the telecom data service.

    Args:
        carrier: Optional carrier name (e.g., '中国移动', '中国联通', '中国电信')

    Returns:
        Network statistics including site count, average rates, PRB utilization
    """
    client = get_telecom_client()
    result = client.get_statistics(carrier)

    if not result.get("success"):
        return f"❌ 获取统计信息失败: {result.get('message', '未知错误')}"

    data = result.get("data", {})
    lines = ["📈 网络统计信息\n" + "="*50 + "\n"]

    if "allCarriers" in data:
        for carrier_name, stats in data["allCarriers"].items():
            lines.append(f"🏢 {carrier_name}")
            lines.append(f"   站点数量: {stats.get('siteCount', 0)}")
            lines.append(f"   平均上行速率: {stats.get('avgUplinkRate', 0):.2f} Mbps")
            lines.append(f"   平均下行速率: {stats.get('avgDownlinkRate', 0):.2f} Mbps")
            lines.append(f"   平均PRB利用率: {stats.get('avgPrbUtilization', 0):.2f}%")
            lines.append("")
    else:
        lines.append(_format_data(data))

    return "\n".join(lines)


@tool
def get_high_prb_sites(threshold: float = 50.0) -> str:
    """Get sites with high PRB utilization from the telecom data service.

    Args:
        threshold: PRB utilization threshold percentage (default: 50.0)

    Returns:
        List of sites with PRB utilization above the threshold
    """
    client = get_telecom_client()
    result = client.query("data", min_prb=threshold)

    if not result.get("success"):
        return f"❌ 获取高PRB利用率数据失败: {result.get('message', '未知错误')}"

    data = result.get("data", [])

    if not data:
        return f"✅ 没有发现PRB利用率高于 {threshold}% 的站点"

    lines = [f"⚠️ PRB利用率 > {threshold}% 的站点\n" + "="*50 + "\n"]
    lines.append(f"共找到 {len(data)} 个高负载站点:\n")

    for item in data:
        lines.append(f"📍 {item.get('siteName', 'N/A')} ({item.get('cellId', 'N/A')})")
        lines.append(f"   运营商: {item.get('carrierName', item.get('carrierCode', 'N/A'))}")
        lines.append(f"   频段: {item.get('frequencyBand', 'N/A')}")
        lines.append(f"   PRB利用率: {item.get('prbUtilization', 0):.2f}%")
        lines.append(f"   上行速率: {item.get('uplinkRate', 0):.2f} Mbps")
        lines.append(f"   下行速率: {item.get('downlinkRate', 0):.2f} Mbps")
        lines.append(f"   位置: {item.get('location', 'N/A')}")
        lines.append("")

    return "\n".join(lines)


@tool
def get_frequency_band_analysis() -> str:
    """Get frequency band analysis across all carriers.

    Returns:
        Analysis of different frequency bands and their usage
    """
    client = get_telecom_client()
    result = client.query("data")

    if not result.get("success"):
        return f"❌ 获取频段分析数据失败: {result.get('message', '未知错误')}"

    data = result.get("data", [])

    if not data:
        return "❌ 暂无频段数据"

    # Group by frequency band
    band_stats = {}
    for item in data:
        band = item.get('frequencyBand', 'Unknown')
        if band not in band_stats:
            band_stats[band] = {
                'count': 0,
                'uplink_rates': [],
                'downlink_rates': [],
                'prb_utils': [],
                'carriers': set()
            }

        stats = band_stats[band]
        stats['count'] += 1
        stats['uplink_rates'].append(item.get('uplinkRate', 0) or 0)
        stats['downlink_rates'].append(item.get('downlinkRate', 0) or 0)
        stats['prb_utils'].append(item.get('prbUtilization', 0) or 0)
        stats['carriers'].add(item.get('carrierName', 'Unknown'))

    lines = ["📡 频段分析报告\n" + "="*50 + "\n"]

    for band, stats in sorted(band_stats.items()):
        avg_uplink = sum(stats['uplink_rates']) / len(stats['uplink_rates']) if stats['uplink_rates'] else 0
        avg_downlink = sum(stats['downlink_rates']) / len(stats['downlink_rates']) if stats['downlink_rates'] else 0
        avg_prb = sum(stats['prb_utils']) / len(stats['prb_utils']) if stats['prb_utils'] else 0

        lines.append(f"📶 {band}")
        lines.append(f"   站点数量: {stats['count']}")
        lines.append(f"   使用运营商: {', '.join(stats['carriers'])}")
        lines.append(f"   平均上行速率: {avg_uplink:.2f} Mbps")
        lines.append(f"   平均下行速率: {avg_downlink:.2f} Mbps")
        lines.append(f"   平均PRB利用率: {avg_prb:.2f}%")
        lines.append("")

    return "\n".join(lines)


# Tool list for export
TELECOM_TOOLS = [
    query_telecom_data,
    get_carrier_info,
    get_network_stats,
    get_high_prb_sites,
    get_frequency_band_analysis,
]
