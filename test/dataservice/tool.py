"""Data Service Tool - Connects the Agent to the Java Data Service"""
import requests
from typing import Optional, Dict, Any, List
from langchain_core.tools import tool

# Data Service API endpoint
DATA_SERVICE_URL = "http://localhost:8081/api/query"


class DataServiceClient:
    """Client for the Data Service API"""

    def __init__(self, base_url: str = DATA_SERVICE_URL):
        self.base_url = base_url
        self.timeout = 30

    def query(
        self,
        query_type: Optional[str] = None,
        carrier: Optional[str] = None,
        band: Optional[str] = None,
        min_prb: Optional[float] = None
    ) -> Dict[str, Any]:
        """Query the data service"""
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
            response = requests.get(
                self.base_url,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "message": "无法连接到数据服务，请确保数据服务已启动 (端口 8081)"
            }
        except requests.exceptions.Timeout:
            return {"success": False, "message": "数据服务请求超时"}
        except Exception as e:
            return {"success": False, "message": f"请求错误: {str(e)}"}

    def natural_query(self, query: str) -> Dict[str, Any]:
        """Send a natural language query"""
        try:
            response = requests.post(
                f"{self.base_url}/natural",
                json={"query": query},
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "message": "无法连接到数据服务，请确保数据服务已启动 (端口 8081)"
            }
        except Exception as e:
            return {"success": False, "message": f"请求错误: {str(e)}"}

    def get_carriers(self) -> List[Dict[str, Any]]:
        """Get all carriers"""
        result = self.query("carriers")
        if result.get("success"):
            return result.get("data", [])
        return []

    def get_all_data(self) -> Dict[str, Any]:
        """Get all carrier data"""
        return self.query("all")

    def get_statistics(self, carrier: str = None) -> Dict[str, Any]:
        """Get statistics"""
        return self.query("statistics", carrier=carrier)

    def get_high_prb_data(self, threshold: float = 50.0) -> List[Dict[str, Any]]:
        """Get data with high PRB utilization"""
        result = self.query("data", min_prb=threshold)
        if result.get("success"):
            return result.get("data", [])
        return []


# Global client instance
_data_service_client = None


def get_data_service_client() -> DataServiceClient:
    """Get or create the data service client"""
    global _data_service_client
    if _data_service_client is None:
        _data_service_client = DataServiceClient()
    return _data_service_client


# LangChain tool for data query
@tool
def query_data_service(query: str) -> str:
    """Query the telecommunications data service for carrier information, network statistics, and historical data.

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
        Formatted data from the data service
    """
    client = get_data_service_client()
    result = client.natural_query(query)

    if not result.get("success", False):
        return f"数据服务错误: {result.get('message', '未知错误')}"

    data = result.get("data", {})
    message = result.get("message", "")

    if isinstance(data, list):
        if not data:
            return "未找到相关数据"

        # Format list data
        lines = [f"【{message}】\n"]
        for item in data[:10]:  # Limit to 10 items
            if isinstance(item, dict):
                lines.append(_format_dict(item))
            else:
                lines.append(str(item))
        return "\n".join(lines)
    elif isinstance(data, dict):
        return f"【{message}】\n" + _format_dict(data)

    return str(data)


@tool
def get_carrier_info(carrier_name: str = None) -> str:
    """Get carrier information from the data service.

    Args:
        carrier_name: Optional carrier name or code (e.g., '中国移动', 'CMCC', '中国联通', 'CUCC')

    Returns:
        Carrier information
    """
    client = get_data_service_client()

    if carrier_name:
        result = client.query("carriers")
    else:
        result = client.query("carriers")

    if not result.get("success"):
        return f"获取运营商信息失败: {result.get('message', '未知错误')}"

    carriers = result.get("data", [])
    if not carriers:
        return "未找到运营商信息"

    lines = ["【运营商信息】\n"]
    for c in carriers:
        lines.append(f"• {c.get('name', 'N/A')} ({c.get('code', 'N/A')})")
        lines.append(f"  类型: {c.get('type', 'N/A')}")
        lines.append(f"  联系方式: {c.get('contact', 'N/A')}\n")

    return "\n".join(lines)


@tool
def get_network_statistics(carrier: str = None) -> str:
    """Get network statistics from the data service.

    Args:
        carrier: Optional carrier name (e.g., '中国移动', '中国联通', '中国电信')

    Returns:
        Network statistics including site count, average rates, PRB utilization
    """
    client = get_data_service_client()
    result = client.get_statistics(carrier)

    if not result.get("success"):
        return f"获取统计信息失败: {result.get('message', '未知错误')}"

    data = result.get("data", {})

    lines = ["【网络统计信息】\n"]
    if "allCarriers" in data:
        for carrier_name, stats in data["allCarriers"].items():
            lines.append(f"运营商: {carrier_name}")
            lines.append(f"  站点数量: {stats.get('siteCount', 0)}")
            lines.append(f"  平均上行速率: {stats.get('avgUplinkRate', 0):.2f} Mbps")
            lines.append(f"  平均下行速率: {stats.get('avgDownlinkRate', 0):.2f} Mbps")
            lines.append(f"  平均PRB利用率: {stats.get('avgPrbUtilization', 0):.2f}%\n")
    else:
        for key, value in data.items():
            if isinstance(value, dict):
                lines.append(f"{key}:")
                for k, v in value.items():
                    lines.append(f"  {k}: {v}")
                lines.append("")

    return "\n".join(lines)


def _format_dict(data: Dict[str, Any], indent: int = 0) -> str:
    """Format a dictionary for display"""
    lines = []
    prefix = "  " * indent

    skip_keys = {'id', 'createdAt', 'updatedAt', 'carrier'}

    for key, value in data.items():
        if key in skip_keys:
            continue

        # Format key name
        key_name = key.replace('_', ' ').title()

        if isinstance(value, dict):
            lines.append(f"{prefix}{key_name}:")
            lines.append(_format_dict(value, indent + 1))
        elif isinstance(value, list):
            if value:
                lines.append(f"{prefix}{key_name}: {len(value)} items")
            else:
                lines.append(f"{prefix}{key_name}: N/A")
        elif value is None:
            lines.append(f"{prefix}{key_name}: N/A")
        elif isinstance(value, float):
            lines.append(f"{prefix}{key_name}: {value:.2f}")
        else:
            lines.append(f"{prefix}{key_name}: {value}")

    return "\n".join(lines)


# Tools list for data service
DATA_SERVICE_TOOLS = [query_data_service, get_carrier_info, get_network_statistics]
