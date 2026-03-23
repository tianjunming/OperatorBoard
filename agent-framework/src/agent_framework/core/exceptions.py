"""Exception classes for the agent framework."""


class AgentFrameworkError(Exception):
    """Base exception for all framework errors."""

    pass


class ToolError(AgentFrameworkError):
    """Exception raised for tool-related errors."""

    pass


class ToolNotFoundError(ToolError):
    """Exception raised when a tool is not found."""

    pass


class ToolExecutionError(ToolError):
    """Exception raised when tool execution fails."""

    pass


class SkillError(AgentFrameworkError):
    """Exception raised for skill-related errors."""

    pass


class SkillNotFoundError(SkillError):
    """Exception raised when a skill is not found."""

    pass


class SkillExecutionError(SkillError):
    """Exception raised when skill execution fails."""

    pass


class MCPError(AgentFrameworkError):
    """Exception raised for MCP-related errors."""

    pass


class MCPConnectionError(MCPError):
    """Exception raised when MCP connection fails."""

    pass


class MCPProtocolError(MCPError):
    """Exception raised for MCP protocol errors."""

    pass


class ConfigurationError(AgentFrameworkError):
    """Exception raised for configuration errors."""

    pass


class RAGError(AgentFrameworkError):
    """Exception raised for RAG-related errors."""

    pass


class EmbeddingError(RAGError):
    """Exception raised for embedding-related errors."""

    pass


class VectorStoreError(RAGError):
    """Exception raised for vector store errors."""

    pass
