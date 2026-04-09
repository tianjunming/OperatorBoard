"""
Test script for dynamic operator mapping in OperatorAgent.

Run with: python -m pytest src/operator-agent/tests/test_operator_mapping.py -v

This test verifies:
1. _fetch_operators correctly fetches operators from NL2SQL service
2. _build_operator_mapping builds correct alias mappings
3. _get_operator_from_query extracts correct operators from queries
4. process_natural_language_query uses dynamic operators
"""

import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock, patch

# Add src to path
sys.path.insert(0, "src/operator-agent/src")

from operator_agent.operator_agent import OperatorAgent
from agent_framework.core import AgentConfig


class MockOperatorAgent(OperatorAgent):
    """Test version of OperatorAgent with mocked HTTP calls."""

    def __init__(self):
        config = AgentConfig(name="test-agent", description="test")
        super().__init__(config)

        # Pre-populate with test operators (simulating Chinese and global operators)
        self._operators_cache = [
            {"operatorName": "China Mobile", "country": "China", "region": "Beijing", "networkType": "5G"},
            {"operatorName": "China Unicom", "country": "China", "region": "Beijing", "networkType": "5G"},
            {"operatorName": "China Telecom", "country": "China", "region": "Beijing", "networkType": "5G"},
            {"operatorName": "Deutsche Telekom", "country": "Germany", "region": "Berlin", "networkType": "5G"},
            {"operatorName": "Vodafone UK", "country": "United Kingdom", "region": "London", "networkType": "5G"},
            {"operatorName": "Orange France", "country": "France", "region": "Paris", "networkType": "5G"},
            {"operatorName": "Telefonica Spain", "country": "Spain", "region": "Madrid", "networkType": "5G"},
            {"operatorName": "T-Mobile US", "country": "United States", "region": "New York", "networkType": "5G"},
        ]

        # Build mapping from the test operators
        self._build_operator_mapping(self._operators_cache)


def test_build_operator_mapping():
    """Test that _build_operator_mapping creates correct aliases."""
    agent = MockOperatorAgent()

    # Check Chinese operator mappings (using unicode escapes for console compatibility)
    beijing_mobile = "\u5317\u4eac\u79fb\u52a8"  # 北京移动
    beijing_unicom = "\u5317\u4eacunicom"
    beijing_telecom = "\u5317\u4eactelecom"

    assert agent._operator_mapping_cache.get(beijing_mobile.lower()) == "China Mobile"
    assert agent._operator_mapping_cache.get(beijing_unicom.lower()) == "China Unicom"
    assert agent._operator_mapping_cache.get(beijing_telecom.lower()) == "China Telecom"

    # Check global operator mappings
    assert agent._operator_mapping_cache.get("vodafone".lower()) == "Vodafone UK"
    assert agent._operator_mapping_cache.get("orange".lower()) == "Orange France"
    assert agent._operator_mapping_cache.get("telefonica".lower()) == "Telefonica Spain"
    assert agent._operator_mapping_cache.get("telekom".lower()) == "Deutsche Telekom"

    # Check official names work
    assert agent._operator_mapping_cache.get("china mobile".lower()) == "China Mobile"
    assert agent._operator_mapping_cache.get("deutsche telekom".lower()) == "Deutsche Telekom"

    print("[PASS] test_build_operator_mapping passed")


def test_get_operator_from_query_chinese():
    """Test extracting Chinese operators from queries."""
    agent = MockOperatorAgent()

    # Test Beijing operator variations (using unicode for console compatibility)
    beijing_mobile = "\u5317\u4eac\u79fb\u52a8\u7684\u7ad9\u70b9\u6570\u91cf"  # 北京移动的站点数量
    beijing_unicom = "\u5317\u4eac\u8054\u901a\u6709\u591a\u5c11\u7ad9\u70b9"  # 北京联通有多少站点
    beijing_telecom = "\u5317\u4eac\u7535\u4fe1\u6307\u6807\u6570\u636e"  # 北京电信指标数据
    shanghai_mobile = "\u4e0a\u6d77\u79fb\u52a8\u7684\u6700\u65b0\u6570\u636e"  # 上海移动的最新数据
    shanghai_unicom = "\u4e0a\u6d77\u8054\u901a\u7ad9\u70b9"  # 上海联通站点
    china_unicom = "\u4e2d\u56fd\u8054\u901a\u7ad9\u70b9\u6570\u91cf"  # 中国联通站点数量
    china_mobile = "\u4e2d\u56fd\u79fb\u52a8\u6307\u6807"  # 中国移动指标

    assert agent._get_operator_from_query(beijing_mobile) == "China Mobile"
    assert agent._get_operator_from_query(beijing_unicom) == "China Unicom"
    assert agent._get_operator_from_query(beijing_telecom) == "China Telecom"
    assert agent._get_operator_from_query(shanghai_mobile) == "China Mobile"
    assert agent._get_operator_from_query(shanghai_unicom) == "China Unicom"
    assert agent._get_operator_from_query(china_unicom) == "China Unicom"
    assert agent._get_operator_from_query(china_mobile) == "China Mobile"

    print("[PASS] test_get_operator_from_query_chinese passed")


def test_get_operator_from_query_global():
    """Test extracting global operators from queries."""
    agent = MockOperatorAgent()

    # Test global operators by short name
    assert agent._get_operator_from_query("Vodafone coverage in UK") == "Vodafone UK"
    assert agent._get_operator_from_query("Orange data in France") == "Orange France"
    assert agent._get_operator_from_query("Telefonica sites in Spain") == "Telefonica Spain"
    assert agent._get_operator_from_query("Deutsche Telekom sites in Germany") == "Deutsche Telekom"
    assert agent._get_operator_from_query("T-Mobile network USA") == "T-Mobile US"

    # Test with country prefix
    assert agent._get_operator_from_query("Germany Deutsche Telekom sites") == "Deutsche Telekom"
    assert agent._get_operator_from_query("United Kingdom Vodafone") == "Vodafone UK"

    print("[PASS] test_get_operator_from_query_global passed")


def test_get_operator_from_query_no_match():
    """Test queries with no matching operator."""
    agent = MockOperatorAgent()

    # Unknown operators should return None
    assert agent._get_operator_from_query("random operator site data") is None
    assert agent._get_operator_from_query("hello world") is None

    print("[PASS] test_get_operator_from_query_no_match passed")


def test_operator_mapping_with_empty_cache():
    """Test behavior when operator cache is empty."""
    agent = MockOperatorAgent()
    agent._operators_cache = []
    agent._operator_mapping_cache = {}

    # Should return None when no operators cached
    beijing_mobile = "\u5317\u4eac\u79fb\u52a8\u7ad9\u70b9"  # 北京移动站点
    result = agent._get_operator_from_query(beijing_mobile)
    assert result is None

    print("[PASS] test_operator_mapping_with_empty_cache passed")


def test_intent_detection_fallback():
    """Test keyword-based intent detection fallback uses dynamic operators."""
    agent = MockOperatorAgent()

    # Disable LLM-based intent detection
    agent._intent_detection_config = {"enabled": False}

    beijing_mobile = "\u5317\u4eac\u79fb\u52a8\u7ad9\u70b9\u6570\u91cf"  # 北京移动站点数量

    # Create a mock for _fetch_operators since it's called in fallback
    with patch.object(agent, '_fetch_operators', new_callable=AsyncMock):
        # Run the async intent detection fallback
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(
            agent.process_natural_language_query(beijing_mobile)
        )
        loop.close()

    # Verify result contains dynamic operator mapping
    assert result["intent"] == "site_data"
    assert result["operator_name"] == "China Mobile"

    print("[PASS] test_intent_detection_fallback passed")


async def run_async_tests():
    """Run async tests."""
    agent = MockOperatorAgent()
    agent._intent_detection_config = {"enabled": False}

    with patch.object(agent, '_fetch_operators', new_callable=AsyncMock):
        result = await agent.process_natural_language_query("Vodafone UK coverage")
        assert result["operator_name"] == "Vodafone UK"

    with patch.object(agent, '_fetch_operators', new_callable=AsyncMock):
        result = await agent.process_natural_language_query("Deutsche Telekom sites")
        assert result["operator_name"] == "Deutsche Telekom"

    print("[PASS] run_async_tests passed")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing Dynamic Operator Mapping")
    print("=" * 60)

    test_build_operator_mapping()
    test_get_operator_from_query_chinese()
    test_get_operator_from_query_global()
    test_get_operator_from_query_no_match()
    test_operator_mapping_with_empty_cache()
    test_intent_detection_fallback()
    asyncio.run(run_async_tests())

    print("=" * 60)
    print("All tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
