"""Skill 9: Streaming Response State Machine Design.

流式响应状态机设计 - 解决SSE流式传输和完整性要求的冲突。

Usage:
    skill = StreamingStateMachineSkill()
    result = await skill.execute(SkillContext(
        skill_name="streaming_state_machine",
        input_data={"state": "streaming"}
    ))
"""

from typing import Any, Dict, List, Optional
from enum import Enum
from agent_framework.skills.base import BaseSkill, SkillContext


class StreamingState(str, Enum):
    """流式响应状态枚举."""
    IDLE = "idle"
    STREAMING = "streaming"
    COMPLETE = "complete"
    ERROR = "error"


class StreamingStateMachineSkill(BaseSkill):
    """Streaming Response State Machine Design.

    流式响应状态机设计 - SSE的简单性是假象，状态管理、错误处理、重试机制缺一不可。

    State Machine:
        idle → streaming → complete/error

    Key Features:
        - 双重发送机制: 流式事件(type:row) + 完成事件(type:done)
        - 边收边渲染 + 导出完整数据
        - 错误处理: 连接断开自动重试、超时降级

    Applicable Scenarios:
        - 数据量大(>1000条)
        - 用户需要实时反馈
        - 导出操作需要完整数据
    """

    name = "streaming_state_machine"
    description = "流式响应状态机设计 - 解决SSE流式传输和完整性要求的冲突"

    STATE_TRANSITIONS = [
        {"from": "idle", "to": "streaming", "trigger": "接收开始事件"},
        {"from": "streaming", "to": "complete", "trigger": "接收完成事件"},
        {"from": "streaming", "to": "error", "trigger": "接收错误事件"},
        {"from": "error", "to": "streaming", "trigger": "重试成功"}
    ]

    DUAL_SEND_MECHANISM = [
        {
            "event": "流式事件",
            "type": "row",
            "purpose": "边收边渲染"
        },
        {
            "event": "完成事件",
            "type": "done",
            "purpose": "包含完整数据"
        }
    ]

    ERROR_HANDLING = [
        {"scenario": "连接断开", "action": "自动重试（有限次）"},
        {"scenario": "超时未完成", "action": "降级为轮询"},
        {"scenario": "部分数据已到达", "action": "提供「导出已有数据」选项"}
    ]

    APPLICABLE_SCENARIOS = [
        "数据量大(>1000条)",
        "用户需要实时反馈",
        "导出操作需要完整数据"
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute streaming state machine analysis.

        Args:
            context: Optional 'state' to analyze

        Returns:
            State machine framework
        """
        current_state = context.input_data.get("state", "all")

        result = {
            "skill": self.name,
            "framework": "流式响应状态机设计",
            "states": [s.value for s in StreamingState],
            "state_transitions": self.STATE_TRANSITIONS,
            "dual_send_mechanism": self.DUAL_SEND_MECHANISM,
            "error_handling": self.ERROR_HANDLING,
            "applicable_scenarios": self.APPLICABLE_SCENARIOS
        }

        if current_state != "all":
            result["current_state"] = current_state
            result["next_valid_transitions"] = self._get_next_states(current_state)

        return result

    def _get_next_states(self, state: str) -> List[str]:
        """获取下一个合法状态."""
        transitions = {
            "idle": ["streaming"],
            "streaming": ["complete", "error"],
            "error": ["streaming"],
            "complete": []
        }
        return transitions.get(state, [])


class StreamingStateMachine:
    """流式响应状态机实现."""

    def __init__(self):
        self.state = StreamingState.IDLE
        self.buffer = []
        self.error_count = 0
        self.max_retries = 3

    def process(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """处理SSE事件."""
        data = event.get("data", {})
        event_type = data.get("type")

        handlers = {
            "start": self._handle_start,
            "row": self._handle_row,
            "done": self._handle_done,
            "error": self._handle_error
        }

        handler = handlers.get(event_type, self._handle_unknown)
        return handler(data)

    def _handle_start(self, data: Dict) -> Dict[str, Any]:
        """处理开始事件."""
        self.state = StreamingState.STREAMING
        self.buffer = []
        return {
            "action": "start",
            "emit": "start",
            "buffer_cleared": True
        }

    def _handle_row(self, data: Dict) -> Dict[str, Any]:
        """处理行数据."""
        self.buffer.append(data.get("row"))
        return {
            "action": "row",
            "emit": "row",
            "row": data.get("row"),
            "buffer_size": len(self.buffer)
        }

    def _handle_done(self, data: Dict) -> Dict[str, Any]:
        """处理完成事件."""
        self.state = StreamingState.COMPLETE
        return {
            "action": "done",
            "emit": "done",
            "rows": self.buffer,
            "total_rows": len(self.buffer)
        }

    def _handle_error(self, data: Dict) -> Dict[str, Any]:
        """处理错误事件."""
        self.error_count += 1
        if self.error_count >= self.max_retries:
            self.state = StreamingState.ERROR
        return {
            "action": "error",
            "error": data.get("error"),
            "retry_count": self.error_count,
            "should_retry": self.error_count < self.max_retries
        }

    def _handle_unknown(self, data: Dict) -> Dict[str, Any]:
        """处理未知事件."""
        return {
            "action": "unknown",
            "event": data
        }
