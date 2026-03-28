"""Coverage Q&A skill for predict-agent."""

from typing import Any, Dict, Optional

from agent_framework.skills import BaseSkill
from agent_framework.llm import LLMClient, LLMConfig


class CoverageQASkill(BaseSkill):
    """
    Skill for coverage prediction knowledge Q&A.

    Uses RAG (Retrieval Augmented Generation) to provide
    accurate answers based on coverage prediction knowledge base.
    """

    name: str = "coverage_qa"
    description: str = "Answer questions about coverage prediction theory, models, and parameters"

    def __init__(
        self,
        vectorstore_path: Optional[str] = None,
        llm_endpoint: Optional[str] = None,
        llm_model: str = "coverage-llm",
        llm_api_key: Optional[str] = None,
        llm_method: str = LLMClient.METHOD_POST,
        **kwargs
    ):
        """
        Initialize CoverageQASkill.

        Args:
            vectorstore_path: Path to coverage knowledge vector store
            llm_endpoint: LLM API endpoint for generation
            llm_model: LLM model name
            llm_api_key: LLM API key
            llm_method: LLM invocation method - "post" or "chatopenai"
        """
        super().__init__(
            name=self.name,
            description=self.description,
            **kwargs
        )
        self.vectorstore_path = vectorstore_path
        self.llm_config = LLMConfig(
            endpoint=llm_endpoint or "",
            model=llm_model,
            api_key=llm_api_key or "",
        )
        self._llm_client = LLMClient(self.llm_config)
        self._llm_method = llm_method
        self._vectorstore = None

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute coverage Q&A.

        Args:
            input_data: Dict with keys:
                - query: User query string

        Returns:
            Q&A result with answer and sources
        """
        query = input_data.get("query", "")
        if not query:
            return {"error": "Query is required"}

        try:
            # Step 1: Retrieve relevant documents
            docs = await self._retrieve_docs(query)

            # Step 2: Generate answer using context
            answer = await self._generate_answer(query, docs)

            return {
                "answer": answer,
                "sources": [doc.get("source", "unknown") for doc in docs[:3]],
                "query": query
            }

        except Exception as e:
            return {"error": f"Coverage Q&A failed: {str(e)}"}

    async def _retrieve_docs(self, query: str, top_k: int = 5) -> list:
        """Retrieve relevant documents from vector store."""
        # TODO: Implement vector store retrieval
        # For now, return mock documents
        return [
            {
                "content": "Coverage prediction uses path loss models to estimate signal strength...",
                "source": "coverage_theory.md"
            },
            {
                "content": "Okumura-Hata model is适用于大面积覆盖预测...",
                "source": "models_okumura_hata.md"
            }
        ]

    async def _generate_answer(self, query: str, docs: list) -> str:
        """Generate answer using LLM with retrieved context."""
        context = "\n\n".join([doc.get("content", "") for doc in docs])

        prompt = f"""Based on the following context, answer the coverage prediction question.

Context:
{context}

Question: {query}

Answer:"""

        try:
            if self._llm_method == LLMClient.METHOD_CHATOPENAI:
                messages = [
                    {"role": "system", "content": "You are a coverage prediction expert. Answer based on the provided context."},
                    {"role": "user", "content": prompt}
                ]
                answer = await self._llm_client.invoke(messages=messages, method=LLMClient.METHOD_CHATOPENAI)
            else:
                answer = await self._llm_client.invoke(prompt=prompt, method=LLMClient.METHOD_POST)
            return answer
        except Exception as e:
            # Fallback response if LLM call fails
            return f"基于覆盖预测理论，回答如下：\n\n问题：{query}\n\n参考答案：覆盖预测主要使用路径损耗模型（如Okumura-Hata、COST231等）来估算信号强度。关键参数包括发射功率、天线高度、工作频率和地形因素。建议根据具体场景选择合适的模型和参数配置。\n\n(Note: LLM调用失败，使用默认回答。)"
