"""LLM client with support for both POST and ChatOpenAI invocation."""

from typing import Any, Dict, List, Optional, Union
import os

from ..core.exceptions import ToolError


class LLMConfig:
    """Configuration for LLM client."""

    def __init__(
        self,
        endpoint: Optional[str] = None,
        model: str = "gpt-3.5-turbo",
        api_key: Optional[str] = None,
        timeout: int = 30,
        max_tokens: int = 2000,
        temperature: float = 0.1,
        **kwargs
    ):
        self.endpoint = endpoint or os.getenv("LLM_ENDPOINT", "")
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.extra = kwargs


class LLMClient:
    """
    Universal LLM client supporting multiple invocation methods:
    1. POST - Direct HTTP POST to endpoint
    2. ChatOpenAI - LangChain ChatOpenAI wrapper
    """

    METHOD_POST = "post"
    METHOD_CHATOPENAI = "chatopenai"

    def __init__(self, config: Optional[LLMConfig] = None):
        """
        Initialize LLM client.

        Args:
            config: LLM configuration
        """
        self.config = config or LLMConfig()
        self._chatopenai = None

    def _get_chatopenai(self):
        """Lazy load ChatOpenAI instance."""
        if self._chatopenai is None:
            try:
                from langchain_openai import ChatOpenAI
            except ImportError:
                raise ToolError("langchain_openai not installed. Install with: pip install langchain-openai")

            self._chatopenai = ChatOpenAI(
                model=self.config.model,
                api_key=self.config.api_key,
                base_url=self.config.endpoint if self.config.endpoint else None,
                timeout=self.config.timeout,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
            )
        return self._chatopenai

    async def invoke(
        self,
        prompt: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        method: str = METHOD_POST,
        **kwargs
    ) -> str:
        """
        Invoke LLM with given prompt or messages.

        Args:
            prompt: Single prompt string (for METHOD_POST)
            messages: List of message dicts with role/content (for ChatOpenAI)
            method: Invocation method - METHOD_POST or METHOD_CHATOPENAI
            **kwargs: Additional parameters

        Returns:
            LLM response text
        """
        if method == self.METHOD_CHATOPENAI:
            return await self._invoke_chatopenai(messages, **kwargs)
        else:
            return await self._invoke_post(prompt, **kwargs)

    async def _invoke_post(self, prompt: Optional[str], **kwargs) -> str:
        """Invoke LLM via direct POST."""
        import httpx

        if not prompt:
            raise ToolError("prompt is required for POST method")

        headers = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        # Build request body - support both OpenAI-compatible and custom formats
        body = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "temperature": kwargs.get("temperature", self.config.temperature),
        }

        # Use httpx Timeout for proper timeout handling
        # connect=10s, read/write=configured timeout
        timeout = httpx.Timeout(connect=10.0, read=float(self.config.timeout), write=60.0, pool=5.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                self.config.endpoint,
                json=body,
                headers=headers,
            )

            if response.status_code != 200:
                raise ToolError(f"LLM POST failed: {response.status_code} - {response.text}")

            result = response.json()

            # Try OpenAI-compatible format first
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0].get("message", {}).get("content", "").strip()

            # Fallback to custom format
            if "text" in result:
                return result["text"].strip()

            raise ToolError(f"Unexpected LLM response format: {result}")

    async def _invoke_chatopenai(
        self,
        messages: Optional[List[Dict[str, str]]] = None,
        **kwargs
    ) -> str:
        """Invoke LLM via OpenAI SDK (ChatCompletions format)."""
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ToolError("openai not installed. Install with: pip install openai")

        if not messages:
            raise ToolError("messages is required for ChatOpenAI method")

        # Create OpenAI client with proper timeout
        timeout = httpx.Timeout(connect=10.0, read=float(self.config.timeout))
        client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.endpoint if self.config.endpoint else None,
            timeout=timeout,
        )

        max_tokens = kwargs.get("max_tokens", self.config.max_tokens)
        temperature = kwargs.get("temperature", self.config.temperature)

        response = await client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        return response.choices[0].message.content.strip()

    async def chat(
        self,
        prompt: str,
        system: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Chat with LLM using prompt (convenience method).

        Args:
            prompt: User prompt
            system: Optional system message
            **kwargs: Additional parameters

        Returns:
            LLM response
        """
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        # Auto-select method based on configuration
        method = kwargs.pop("method", None)
        if method is None:
            method = self.METHOD_CHATOPENAI if self.config.endpoint and "openai" in self.config.endpoint.lower() else self.METHOD_POST

        return await self.invoke(messages=messages if method == self.METHOD_CHATOPENAI else None,
                                  prompt=prompt if method == self.METHOD_POST else None,
                                  method=method, **kwargs)


def create_llm_client(
    endpoint: Optional[str] = None,
    model: str = "gpt-3.5-turbo",
    api_key: Optional[str] = None,
    method: str = LLMClient.METHOD_POST,
    **kwargs
) -> LLMClient:
    """
    Factory function to create an LLM client.

    Args:
        endpoint: LLM API endpoint
        model: Model name
        api_key: API key
        method: Default invocation method
        **kwargs: Additional config

    Returns:
        LLMClient instance
    """
    config = LLMConfig(
        endpoint=endpoint,
        model=model,
        api_key=api_key,
        **kwargs
    )
    client = LLMClient(config)
    # Store default method
    client._default_method = method
    return client
