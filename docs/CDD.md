# OperatorBoard 代码设计文档

**文档版本**: 1.2
**编制日期**: 2026-04-16
**参考标准**: Google Style Guide | SOLID Principles

---

## 1. 概述

### 1.1 文档目的

本文档定义OperatorBoard系统的代码规范、架构模式、模块结构和核心实现细节，为开发团队提供编码指导。

### 1.2 编码原则

| 原则 | 说明 |
|------|------|
| SOLID | 单一职责、开闭原则、里氏替换、接口隔离、依赖反转 |
| DRY | Don't Repeat Yourself，避免重复代码 |
| KISS | Keep It Simple, Stupid，保持简单 |
| YAGNI | You Aren't Gonna Need It，避免过度设计 |

---

## 2. 项目结构

### 2.1 整体目录结构

```
D:\develop\OperatorBoard\
├── src/
│   ├── agent-framework/           # Python Agent框架
│   │   ├── src/agent_framework/
│   │   │   ├── __init__.py
│   │   │   ├── api/               # API基类与错误处理
│   │   │   │   ├── __init__.py
│   │   │   │   ├── server.py      # BaseAgentServer
│   │   │   │   ├── error.py       # ErrorCode, AgentAPIError
│   │   │   │   └── types.py       # API类型定义
│   │   │   ├── core/              # 核心组件
│   │   │   │   ├── __init__.py
│   │   │   │   ├── agent.py       # BaseAgent
│   │   │   │   ├── types.py       # Types, Intent, IntentResult
│   │   │   │   └── exceptions.py  # Agent异常
│   │   │   ├── tools/             # 工具系统
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py        # BaseTool
│   │   │   │   └── registry.py    # ToolRegistry
│   │   │   ├── skills/           # 技能系统
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py        # BaseSkill
│   │   │   │   └── context.py     # SkillContext
│   │   │   ├── rag/              # RAG系统
│   │   │   │   ├── __init__.py
│   │   │   │   ├── loaders/       # 语料加载器
│   │   │   │   ├── base.py        # BaseLoader
│   │   │   │   └── vectorstore.py # VectorStoreManager
│   │   │   ├── llm/              # LLM客户端
│   │   │   │   ├── __init__.py
│   │   │   │   ├── client.py      # LLMClient
│   │   │   │   ├── config.py      # LLMConfig
│   │   │   │   └── factory.py     # create_llm_client
│   │   │   └── config/           # 配置管理
│   │   │       ├── __init__.py
│   │   │       ├── loader.py      # ConfigLoader
│   │   │       └── finder.py      # find_config_dir
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── operator-agent/           # 运营商Agent
│   │   ├── src/operator_agent/
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   └── server.py      # Agent API Server
│   │   │   ├── agent.py           # OperatorAgent
│   │   │   ├── intent.py          # IntentDetection
│   │   │   ├── router.py          # 路由逻辑
│   │   │   ├── tools/             # Agent工具
│   │   │   │   ├── __init__.py
│   │   │   │   └── java_service.py # JavaMicroserviceTool
│   │   │   └── prompts/
│   │   │       └── intent.py      # 意图识别Prompt
│   │   └── configs/
│   │       ├── defaults.yaml
│   │       ├── intent_detection.yaml
│   │       └── tools.yaml
│   ├── predict-agent/            # 预测Agent
│   │   ├── src/predict_agent/
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   └── server.py
│   │   │   ├── agent.py
│   │   │   ├── skills/
│   │   │   │   ├── coverage_qa.py
│   │   │   │   └── simulation.py
│   │   │   └── prompts/
│   │   └── configs/
│   ├── auth-agent/               # 用户认证Agent
│   │   ├── src/auth_agent/
│   │   │   ├── __init__.py
│   │   │   ├── api/
│   │   │   │   ├── server.py      # AuthAgentServer
│   │   │   │   ├── models.py      # Pydantic models
│   │   │   │   ├── schemas.py      # SQLAlchemy ORM
│   │   │   │   ├── service.py     # 业务服务
│   │   │   │   ├── auth.py        # JWT认证
│   │   │   │   ├── chat_routes.py # 聊天路由
│   │   │   │   └── dependencies.py # 依赖注入
│   │   │   └── migrations/
│   │   │       └── add_approval_fields.sql
│   ├── operator-service/         # Java微服务
│   │   └── src/main/java/com/operator/nl2sql/
│   │       ├── controller/
│   │       │   ├── Nl2SqlController.java
│   │       │   └── QueryController.java
│   │       ├── service/
│   │       │   ├── SqlGeneratorService.java
│   │       │   └── QueryService.java
│   │       ├── mapper/
│   │       └── model/
│   │           └── schema.sql
│   └── agent-app/                # React前端
│       ├── src/
│       │   ├── components/
│       │   │   ├── ChatView.jsx
│       │   │   ├── MessageList.jsx
│       │   │   ├── MessageItem.jsx
│       │   │   ├── QueryConfirmationDialog.jsx
│       │   │   ├── KpiCard.jsx
│       │   │   ├── SkeletonLoader.jsx
│       │   │   ├── AuthLogin.jsx      # 登录组件
│       │   │   ├── AuthRegister.jsx   # 注册组件
│       │   │   ├── UserManagement.jsx # 用户管理（含审批）
│       │   │   ├── PendingApprovals.jsx # 待审批用户列表组件
│       │   │   └── charts/
│       │   │       ├── ChartContainer.jsx
│       │   │       ├── ChartBlock.jsx
│       │   │       └── RecommendationBadge.jsx
│       │   ├── hooks/
│       │   │   ├── useStreamingAgent.js
│       │   │   └── useChatStore.js
│       │   ├── utils/
│       │   │   ├── chartRecommendation.js
│       │   │   └── formatters.js
│       │   ├── services/
│       │   │   └── api.js
│       │   ├── types/
│       │   │   └── index.js
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── public/
│       ├── tests/
│       │   └── e2e/
│       ├── playwright.config.js
│       └── package.json
├── docs/
│   ├── PRD.md                    # 需求分析
│   ├── SDD.md                    # 软件设计
│   ├── STD.md                    # 测试设计
│   ├── CDD.md                    # 代码设计
│   └── views/
├── configs/                      # 共享配置
├── CLAUDE.md
└── README.md
```

---

## 3. Python编码规范

### 3.1 代码风格

| 规范 | 标准 |
|------|------|
| 风格 | PEP 8 |
| 类型提示 | 必须使用 |
| 文档字符串 | Google Style |
| 行长度 | 100字符 |

### 3.2 模块结构模板

```python
"""模块简短描述。

详细描述（可选）。

Example:
    >>> from agent_framework.api import BaseAgentServer
    >>> server = BaseAgentServer(AgentClass)
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Optional
from dataclasses import dataclass

if TYPE_CHECKING:
    from agent_framework.core.agent import BaseAgent

__all__ = ["BaseAgentServer", "AgentAPIError"]


@dataclass(frozen=True)
class ErrorCode:
    """错误码定义。"""
    code: str
    message_en: str
    message_zh: str
    status_code: int = 500


class AgentAPIError(Exception):
    """Agent API异常。

    Attributes:
        error_code: 错误码对象
        detail: 详细错误信息
    """

    def __init__(
        self,
        error_code: ErrorCode,
        detail: Optional[str] = None
    ) -> None:
        super().__init__(error_code.message_en)
        self.error_code = error_code
        self.detail = detail

    def to_dict(self) -> dict[str, Any]:
        """转换为字典格式。"""
        return {
            "error": {
                "code": self.error_code.code,
                "message_en": self.error_code.message_en,
                "message_zh": self.error_code.message_zh,
                "detail": self.detail
            }
        }
```

### 3.3 核心实现

#### BaseAgentServer

```python
# agent_framework/api/server.py
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Optional, Type

from fastapi import FastAPI, GET
from pydantic import BaseModel

if TYPE_CHECKING:
    from agent_framework.core.agent import BaseAgent

logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str
    agent: str
    version: str


class CapabilitiesResponse(BaseModel):
    agent: str
    version: str
    capabilities: list[dict[str, Any]]


class BaseAgentServer:
    """FastAPI服务器基类。

    提供单例Agent管理和通用路由。

    Attributes:
        agent_class: Agent类引用
        _agent: 单例Agent实例
    """

    def __init__(
        self,
        agent_class: Type["BaseAgent"],
        agent_name: str = "Agent",
        version: str = "1.0.0"
    ) -> None:
        self.agent_class = agent_class
        self.agent_name = agent_name
        self.version = version
        self._agent: Optional["BaseAgent"] = None
        self.app = FastAPI(title=agent_name)
        self._setup_routes()

    def _setup_routes(self) -> None:
        """设置通用路由。"""
        self.app.add_api_route("/health", self.health, methods=["GET"])
        self.app.add_api_route("/capabilities", self.capabilities, methods=["GET"])

    async def get_agent(self) -> "BaseAgent":
        """获取或创建单例Agent实例。"""
        if self._agent is None:
            self._agent = await self.create_agent()
            logger.info(f"{self.agent_name} initialized")
        return self._agent

    async def create_agent(self) -> "BaseAgent":
        """创建Agent实例。子类实现。"""
        raise NotImplementedError

    async def health(self) -> HealthResponse:
        """健康检查。"""
        return HealthResponse(
            status="healthy",
            agent=self.agent_name,
            version=self.version
        )

    async def capabilities(self) -> CapabilitiesResponse:
        """获取Agent能力列表。"""
        agent = await self.get_agent()
        return CapabilitiesResponse(
            agent=self.agent_name,
            version=self.version,
            capabilities=agent.get_capabilities()
        )
```

#### BaseTool

```python
# agent_framework/tools/base.py
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class BaseTool:
    """工具基类。

    所有Tool需继承此类并实现ainvoke方法。

    Attributes:
        name: 工具名称
        description: 工具描述
        enabled: 是否启用
    """

    name: str
    description: str
    enabled: bool = True

    def __init__(self) -> None:
        self._is_running = False

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str:
        """异步执行工具。

        Args:
            tool_input: 工具输入参数

        Returns:
            格式化结果字符串
        """
        if not self.enabled:
            raise AgentAPIError(TOOL_DISABLED, detail=f"Tool {self.name} is disabled")

        self._is_running = True
        try:
            result = await self._ainvoke(tool_input)
            return self._format_result(result)
        finally:
            self._is_running = False

    async def _ainvoke(self, tool_input: Dict[str, Any]) -> Any:
        """实际执行逻辑。子类实现。"""
        raise NotImplementedError

    def _run(self, tool_input: Dict[str, Any]) -> str:
        """同步执行桥接。

        用于不支持async的环境。
        """
        return asyncio.run(self.ainvoke(tool_input))

    def _format_result(self, result: Any) -> str:
        """格式化结果为字符串。默认JSON。"""
        import json
        return json.dumps(result, ensure_ascii=False, indent=2)

    @property
    def is_running(self) -> bool:
        """是否正在执行。"""
        return self._is_running
```

---

## 4. Java编码规范

### 4.1 代码风格

| 规范 | 标准 |
|------|------|
| 风格 | Google Java Style |
| 命名 | camelCase (方法/变量), PascalCase (类) |
| 注解 | Lombok @Data/@Slf4j |
| 异常 | 自定义异常+全局处理 |

### 4.2 Controller模板

```java
package com.operator.nl2sql.controller;

import com.operator.nl2sql.service.QueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/query")
@RequiredArgsConstructor
public class QueryController {

    private final QueryService queryService;

    @GetMapping("/operators")
    public ResponseEntity<Map<String, Object>> getOperators() {
        return ResponseEntity.ok(queryService.getOperators());
    }

    @GetMapping("/site-summary")
    public ResponseEntity<Map<String, Object>> getSiteSummary(
            @RequestParam(required = false) String operator,
            @RequestParam(required = false) String band,
            @RequestParam(defaultValue = "10") Integer limit
    ) {
        return ResponseEntity.ok(queryService.getSiteSummary(operator, band, limit));
    }
}
```

---

## 5. React编码规范

### 5.1 代码风格

| 规范 | 标准 |
|------|------|
| 风格 | Airbnb React |
| Hooks | eslint-plugin-react-hooks |
| 样式 | CSS Modules |
| 组件 | 函数组件+Hooks |

### 5.2 组件结构模板

```jsx
import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';
import './ChartBlock.css';

/**
 * ChartBlock - 图表Block组件
 *
 * @param {Object} props
 * @param {string} props.chartType - 图表类型: bar|line|pie|area
 * @param {Array} props.data - 图表数据
 * @param {string} props.xKey - X轴字段
 * @param {string[]} props.yKeys - Y轴字段数组
 */
export function ChartBlock({
  chartType = 'bar',
  title,
  data = [],
  xKey = 'name',
  yKeys = [],
  height = 300,
  showRecommendation = false,
  recommendation = null,
  onAcceptRecommendation
}) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [acceptedRecommendation, setAcceptedRecommendation] = useState(false);

  // Memo
  const displayType = useMemo(() => {
    if (acceptedRecommendation && recommendation) {
      return recommendation.type;
    }
    return chartType;
  }, [chartType, acceptedRecommendation, recommendation]);

  const chartHeight = useMemo(() => {
    return isExpanded ? height * 1.5 : height;
  }, [isExpanded, height]);

  // Callback
  const handleAcceptRecommendation = useCallback(() => {
    setAcceptedRecommendation(true);
    onAcceptRecommendation?.();
  }, [onAcceptRecommendation]);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="chart-block">
      <div className="chart-header">
        {title && <h4 className="chart-title">{title}</h4>}
        {showRecommendation && recommendation && !acceptedRecommendation && (
          <RecommendationBadge
            type={recommendation.type}
            reason={recommendation.reason}
            onAccept={handleAcceptRecommendation}
          />
        )}
      </div>

      <div className="chart-body" style={{ height: chartHeight }}>
        <RechartsComponent
          type={displayType}
          data={data}
          xKey={xKey}
          yKeys={yKeys}
        />
      </div>

      <button onClick={handleToggle} className="chart-toggle">
        {isExpanded ? '收起' : '展开'}
      </button>
    </div>
  );
}

ChartBlock.propTypes = {
  chartType: PropTypes.oneOf(['bar', 'line', 'pie', 'area']),
  title: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.object),
  xKey: PropTypes.string,
  yKeys: PropTypes.arrayOf(PropTypes.string),
  height: PropTypes.number,
  showRecommendation: PropTypes.bool,
  recommendation: PropTypes.shape({
    type: PropTypes.string,
    reason: PropTypes.string,
    confidence: PropTypes.string
  }),
  onAcceptRecommendation: PropTypes.func
};
```

---

## 6. 核心算法实现

### 6.1 图表推荐算法

```javascript
// src/utils/chartRecommendation.js

/**
 * 检测数据是否包含时间维度
 * @param {Array} data - 数据数组
 * @param {string} column - 列名
 * @returns {boolean}
 */
export function hasTimeDimension(data, column) {
  if (!data || data.length === 0) return false;

  const timePatterns = [
    /^\d{4}-\d{2}$/,           // YYYY-MM (月份)
    /^\d{4}-\d{2}-\d{2}$/,     // YYYY-MM-DD (日期)
    /^\d{4}年\d{1,2}月$/,       // 2026年3月
    /Q[1-4]$/,                  // Q1, Q2 (季度)
  ];

  const sampleValue = data[0]?.[column];
  if (typeof sampleValue !== 'string') return false;

  return timePatterns.some(pattern => pattern.test(sampleValue));
}

/**
 * 检测数据是否包含比率指标 (0-100范围)
 * @param {Array} data - 数据数组
 * @param {string[]} keys - 指标字段数组
 * @returns {boolean}
 */
export function hasRatioMetrics(data, keys) {
  if (!data || data.length === 0 || !keys?.length) return false;

  const sample = data[0];
  return keys.every(key => {
    const value = sample[key];
    return typeof value === 'number' && value >= 0 && value <= 100;
  });
}

/**
 * 检测是否为占比关系数据
 * @param {Array} data - 数据数组
 * @param {string[]} keys - 指标字段数组
 * @returns {boolean}
 */
export function isPartToWhole(data, keys) {
  if (!data || data.length < 2 || !keys?.length) return false;

  // 检查是否有单一指标，且数据点数量适合做饼图
  if (keys.length !== 1) return false;

  const key = keys[0];
  const total = data.reduce((sum, item) => sum + (item[key] || 0), 0);

  // 检查数值是否接近100%或总和合理
  const hasPercentage = data.some(item => {
    const val = item[key];
    return val > 0 && val <= 100;
  });

  return hasPercentage && total > 0;
}

/**
 * 推荐最佳图表类型
 * @param {Object} params
 * @param {Array} params.data - 数据数组
 * @param {string[]} params.keys - 指标字段数组
 * @param {string} params.column - 列名字段
 * @returns {Object} {type, reason, confidence}
 */
export function recommendChartType({ data, keys, column }) {
  if (!data || data.length === 0 || !keys || keys.length === 0) {
    return { type: 'bar', reason: '默认柱状图', confidence: 'low' };
  }

  const hasTime = hasTimeDimension(data, column);
  const hasRatio = hasRatioMetrics(data, keys);
  const isPartWhole = isPartToWhole(data, keys);

  // 时间序列 + 单指标 → line
  if (hasTime && keys.length === 1) {
    return { type: 'line', reason: '时间序列展示趋势变化', confidence: 'high' };
  }

  // 时间序列 + 多指标 → area
  if (hasTime && keys.length > 1) {
    return { type: 'area', reason: '多指标对比展示', confidence: 'high' };
  }

  // 占比数据 (2-8类) → pie
  if (isPartWhole && data.length >= 2 && data.length <= 8) {
    return { type: 'pie', reason: '占比数据适合饼图展示', confidence: 'high' };
  }

  // 分类对比 → bar
  if (keys.length >= 1) {
    if (keys.length === 1) {
      return { type: 'bar', reason: '分类对比适合柱状图', confidence: 'medium' };
    } else {
      return { type: 'bar', reason: '多指标对比适合柱状图', confidence: 'medium' };
    }
  }

  return { type: 'bar', reason: '默认柱状图', confidence: 'low' };
}

export function getChartRecommendation(params) {
  return recommendChartType(params);
}
```

### 6.2 意图识别实现

```python
# operator_agent/intent.py
import json
import logging
from typing import Optional

from agent_framework.llm import create_llm_client

logger = logging.getLogger(__name__)

# 运营商名称映射 (中文 → 英文)
OPERATOR_MAPPING = {
    "北京联通": "China Unicom",
    "上海联通": "China Unicom",
    "广州联通": "China Unicom",
    "深圳联通": "China Unicom",
    "北京移动": "China Mobile",
    "上海移动": "China Mobile",
    "广州移动": "China Mobile",
    "深圳移动": "China Mobile",
    "北京电信": "China Telecom",
    "上海电信": "China Telecom",
    "广州电信": "China Telecom",
    "深圳电信": "China Telecom",
}

# 支持的频段列表
BAND_LIST = [
    "700M", "800M", "900M", "1400M", "1800M",
    "2100M", "2600M", "3500M", "4900M", "2300M"
]

# 网络类型映射
NETWORK_TYPE_MAPPING = {
    "5G": "NR",
    "NR": "NR",
    "4G": "LTE",
    "LTE": "LTE",
    "3G": "LTE",  # 简化处理
}


class IntentDetection:
    """意图识别器。"""

    def __init__(self, config: dict):
        self.llm_client = create_llm_client(config)
        self.prompt_template = self._load_prompt()

    def _load_prompt(self) -> str:
        return """You are an intent detection system for a telecom operator data platform.

Given user query: "{query}"

Detect the intent and extract parameters. Return JSON format:

{{
    "intent": "site_data|indicator_data|operator_list|latest_data|nl2sql",
    "operator_name": "China Unicom|China Mobile|China Telecom|null",
    "band": "700M|800M|...|3500M|null",
    "network_type": "LTE|NR|null",
    "data_month": "YYYY-MM|null",
    "limit": 10,
    "confidence": 0.0-1.0
}}

Rules:
1. site_data: Query site/cell counts or summaries
2. indicator_data: Query network performance indicators
3. operator_list: List available operators
4. latest_data: Filter for most recent data
5. nl2sql: Direct SQL query or complex analysis

Examples:
- "联通有多少站点" → intent="site_data", operator_name="China Unicom"
- "移动5G速率" → intent="indicator_data", operator_name="China Mobile", network_type="NR"
- "3500M小区数" → intent="site_data", band="3500M"
- "最新月份数据" → intent="latest_data"
"""  # noqa: E501

    async def detect(self, query: str) -> dict:
        """检测用户查询意图。

        Args:
            query: 用户查询文本

        Returns:
            IntentResult字典
        """
        prompt = self.prompt_template.format(query=query)

        try:
            response = await self.llm_client.generate(prompt)
            result = json.loads(response)

            # 后处理：运营商名称映射
            if result.get("operator_name"):
                result["operator_name"] = self._map_operator(
                    result["operator_name"]
                )

            # 后处理：频段标准化
            if result.get("band"):
                result["band"] = self._normalize_band(result["band"])

            # 后处理：网络类型映射
            if result.get("network_type"):
                result["network_type"] = NETWORK_TYPE_MAPPING.get(
                    result["network_type"],
                    result["network_type"]
                )

            return result

        except Exception as e:
            logger.error(f"Intent detection failed: {e}")
            return {
                "intent": "nl2sql",
                "confidence": 0.0,
                "error": str(e)
            }

    def _map_operator(self, name: str) -> str:
        """映射运营商名称。"""
        return OPERATOR_MAPPING.get(name, name)

    def _normalize_band(self, band: str) -> str:
        """标准化频段表示。"""
        # 移除空格，确保大写
        band = band.upper().replace(" ", "")

        # 处理 MHz 后缀
        if band.endswith("MHZ"):
            band = band.replace("MHZ", "M")

        # 确保包含M后缀
        if not band.endswith("M") and band.isdigit():
            band = band + "M"

        return band
```

---

## 7. API响应格式

### 7.1 成功响应

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-04-12T10:30:00Z"
}
```

### 7.2 错误响应

```json
{
  "success": false,
  "error": {
    "code": "E3001",
    "message_zh": "获取站点小区数据失败",
    "message_en": "Failed to get site cells",
    "detail": "Database connection timeout"
  },
  "timestamp": "2026-04-12T10:30:00Z"
}
```

### 7.3 SSE事件格式

```javascript
// 事件类型
const SSE_EVENTS = {
  START: 'start',           // 流开始
  CONTENT: 'content',       // 文本内容
  CHART: 'chart',          // 图表数据
  TABLE: 'table',          // 表格数据
  METRICS: 'metrics',      // 指标数据
  CONFIRMATION: 'confirmation',  // 确认请求
  ERROR: 'error',          // 错误
  DONE: 'done'            // 流结束
};

// 事件示例
const examples = {
  start: `data: {"type": "start", "request_id": "req_001"}\n\n`,
  content: `data: {"type": "content", "content": "正在查询..."}\n\n`,
  chart: `data: {"type": "chart", "chartType": "bar", "data": [...]}\n\n`,
  confirmation: `data: {"type": "confirmation", "options": {"operators": [...]}}\n\n`,
  error: `data: {"type": "error", "code": "E3001", "message": "查询失败"}\n\n`,
  done: `data: {"type": "done", "request_id": "req_001"}\n\n`
};
```

---

## 8. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.2 | 2026-04-16 | 新增PendingApprovals组件、AuthRegister组件、UserManagement增强 |
| 1.1 | 2026-04-16 | 新增auth-agent项目结构、AuthRegister、UserManagement组件 |
| 1.0 | 2026-04-12 | 初始版本，代码设计文档 |
