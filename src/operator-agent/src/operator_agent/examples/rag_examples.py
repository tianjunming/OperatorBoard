"""RAG 使用示例 - 演示如何创建向量存储、加载语料、搜索和二次排序"""

import asyncio
import os
from pathlib import Path

# === 示例1: 使用 DirectoryLoader 从目录加载语料 ===
def example_directory_loader():
    """从目录加载所有支持的文档"""
    from agent_framework.rag.loaders import DirectoryLoader

    loader = DirectoryLoader(
        directory="./data/telecom_knowledge",
        glob_patterns=["**/*.md", "**/*.txt", "**/*.json"],
        exclude_patterns=["*.tmp", "__pycache__", ".git"],
        recursive=True,
        chunk_size=1000,
        chunk_overlap=200,
    )

    documents = loader.load()
    print(f"[DirectoryLoader] Loaded {len(documents)} documents")
    return documents


# === 示例2: 使用 DatabaseLoader 从数据库加载语料 ===
def example_database_loader():
    """从 MySQL 数据库加载知识"""
    from agent_framework.rag.loaders import DatabaseLoader

    loader = DatabaseLoader(
        connection_config={
            "host": os.getenv("DB_HOST", "localhost"),
            "port": 3306,
            "user": os.getenv("DB_USERNAME", "root"),
            "password": os.getenv("DB_PASSWORD", ""),
            "database": "operator_db",
        },
        query_template="""
            SELECT title, content, category, created_at
            FROM knowledge_base
            WHERE deleted_at IS NULL
            AND updated_at > '{last_update}'
        """,
        params={"last_update": "2024-01-01"},
        metadata_columns=["category", "created_at"],
        refresh_interval=3600,
    )

    documents = loader.load()
    print(f"[DatabaseLoader] Loaded {len(documents)} documents")
    return documents


# === 示例3: 使用 FileLoader 加载单个文件 ===
def example_file_loader():
    """加载单个文件"""
    from agent_framework.rag.loaders import FileLoader

    loader = FileLoader(
        file_path="./data/guide.md",
        extract_metadata=True,
        chunk_size=500,
        chunk_overlap=50,
    )

    documents = loader.load()
    print(f"[FileLoader] Loaded {len(documents)} documents")
    return documents


# === 示例4: 使用 HybridLoader 组合多个加载器 ===
def example_hybrid_loader():
    """组合多个数据源的混合加载器"""
    from agent_framework.rag.loaders import DirectoryLoader, DatabaseLoader, HybridLoader

    # 创建各个加载器
    doc_loader = DirectoryLoader(
        directory="./data/docs",
        glob_patterns=["**/*.md", "**/*.txt"],
        chunk_size=1000,
    )

    db_loader = DatabaseLoader(
        connection_config={
            "host": "localhost",
            "port": 3306,
            "user": "root",
            "password": "password",
            "database": "knowledge_db",
        },
        query_template="SELECT content, metadata FROM documents WHERE type = 'technical'",
    )

    # 创建混合加载器
    hybrid_loader = HybridLoader(
        loaders=[doc_loader, db_loader],
        weights={
            "file://./data/docs": 0.7,
            "mysql://localhost/knowledge_db": 0.3,
        },
        priority=["file://./data/docs", "mysql://localhost/knowledge_db"],
        deduplicate=True,
    )

    documents = hybrid_loader.load()
    print(f"[HybridLoader] Loaded {len(documents)} documents")
    return documents


# === 示例5: 使用 RAGService 创建向量存储 ===
async def example_rag_service_create_store():
    """使用 RAGService 创建和管理向量存储"""
    from agent_framework.rag.service import RAGService
    from agent_framework.rag.loaders import DirectoryLoader
    from agent_framework.rag.embeddings import create_embeddings

    # 创建 RAG 服务
    rag_service = RAGService()

    # 创建 embeddings
    embeddings = create_embeddings(provider="openai")

    # 创建目录加载器
    loader = DirectoryLoader(
        directory="./data/telecom_knowledge",
        glob_patterns=["**/*.md", "**/*.txt"],
        chunk_size=1000,
    )

    # 创建向量存储
    rag_service.create_store(
        store_name="telecom_knowledge",
        loader=loader,
        embeddings=embeddings,
        persist_directory="./data/vectorstore",
        collection_name="telecom",
    )

    print("[RAGService] Created vector store 'telecom_knowledge'")
    return rag_service


# === 示例6: 使用二次排序器 (DocumentReranker) ===
def example_document_reranker():
    """使用多维排序配置"""
    from agent_framework.rag.loaders import (
        DocumentReranker,
        RerankConfig,
        SortField,
        SortOrder,
    )
    from langchain_core.documents import Document

    # 创建配置：先按时间，再按相似度分数
    configs = [
        RerankConfig(field=SortField.TIME, order=SortOrder.DESC),
        RerankConfig(field=SortField.SCORE, order=SortOrder.DESC),
    ]

    reranker = DocumentReranker(configs=configs)

    # 模拟文档和分数
    docs = [
        Document(page_content="Doc 1", metadata={"modified_time": "2026-01-01T00:00:00"}),
        Document(page_content="Doc 2", metadata={"modified_time": "2026-05-01T00:00:00"}),
        Document(page_content="Doc 3", metadata={"modified_time": "2026-03-01T00:00:00"}),
    ]
    scores = [0.9, 0.7, 0.8]

    # 排序
    reranked = reranker.rerank(docs, scores)
    print(f"[DocumentReranker] Reranked {len(reranked)} documents")
    for i, doc in enumerate(reranked):
        print(f"  {i+1}. {doc.page_content}")

    return reranked


# === 示例7: 使用混合排序器 (HybridReranker) ===
def example_hybrid_reranker():
    """使用混合评分排序（相似度 + 时效性 + 权重）"""
    from agent_framework.rag.loaders import HybridReranker
    from langchain_core.documents import Document
    from datetime import datetime

    # 创建混合排序器
    reranker = HybridReranker(
        base_score_weight=0.7,  # 相似度权重
        recency_weight=0.2,      # 时效性权重
        weight_weight=0.1,       # 来源权重
    )

    docs = [
        Document(page_content="Recent Doc", metadata={"modified_time": "2026-05-01T00:00:00"}),
        Document(page_content="Old Doc", metadata={"modified_time": "2025-01-01T00:00:00"}),
    ]
    scores = [0.6, 0.95]  # Old doc has higher similarity but is older

    # 使用混合评分排序 (返回 List[Document])
    reranked = reranker.rerank_with_hybrid_score(
        docs,
        scores,
        reference_time=datetime.now(),
    )

    print("[HybridReranker] Results (newer docs with good score rank higher):")
    for i, doc in enumerate(reranked):
        print(f"  {i+1}. {doc.page_content}")

    return reranked


# === 示例8: 完整的工作流程 - 创建到搜索 ===
async def example_full_workflow():
    """完整工作流程演示"""
    from agent_framework.rag.service import RAGService
    from agent_framework.rag.loaders import DirectoryLoader, create_reranker
    from agent_framework.rag.embeddings import create_embeddings

    print("=== RAG 完整工作流程 ===\n")

    # 1. 初始化服务
    rag_service = RAGService()
    embeddings = create_embeddings(provider="openai")

    # 2. 创建测试文档（模拟加载）
    from langchain_core.documents import Document
    test_docs = [
        Document(
            page_content="5G NR (New Radio) 是第五代移动通信技术的无线接入技术。",
            metadata={"source": "protocol", "modified_time": "2026-01-15T10:00:00"}
        ),
        Document(
            page_content="LTE (Long Term Evolution) 是4G移动通信标准。",
            metadata={"source": "protocol", "modified_time": "2025-06-20T10:00:00"}
        ),
        Document(
            page_content="覆盖预测是评估无线网络信号覆盖范围的过程。",
            metadata={"source": "simulation", "modified_time": "2026-03-10T10:00:00"}
        ),
    ]

    # 3. 创建向量存储
    from agent_framework.rag.vectorstore import VectorStoreManager
    from langchain_community.vectorstores import Chroma

    # 简化：直接添加文档到存储（假设已有 embedding）
    # 实际使用中需要先生成 embeddings
    print("Note: 完整流程需要 OpenAI API key 配置")

    # 4. 设置二次排序
    rag_service.set_reranker("hybrid")
    print("[Step 4] Set reranker to 'hybrid'")

    # 5. 搜索（需要先有数据）
    # results = await rag_service.search("5G NR 覆盖", k=3)
    # print(f"[Step 5] Search found {len(results)} results")

    return rag_service


# === 示例9: 使用 RAG API 接口创建存储 ===
async def example_rag_api_usage():
    """演示通过 API 使用 RAG 功能"""
    import httpx

    base_url = "http://localhost:8080"
    headers = {"X-API-Key": "your-api-key", "Content-Type": "application/json"}

    print("=== RAG API 使用示例 ===\n")

    # 1. 列出所有存储
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base_url}/api/rag/stores", headers=headers)
        print(f"[API] GET /api/rag/stores: {resp.status_code}")
        print(f"  Stores: {resp.json()}\n")

    # 2. 设置排序策略
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/api/rag/reranker/set?strategy=hybrid",
            headers=headers
        )
        print(f"[API] POST /api/rag/reranker/set: {resp.status_code}")
        print(f"  Response: {resp.json()}\n")

    # 3. 创建向量存储
    create_request = {
        "store_name": "telecom_kb",
        "loader": {
            "name": "docs",
            "loader_type": "directory",
            "path": "./data/docs",
            "recursive": True,
            "glob_patterns": ["**/*.md", "**/*.txt"],
            "chunk_size": 1000,
            "chunk_overlap": 200,
        },
        "persist_directory": "./data/vectorstore",
        "collection_name": "telecom",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/api/rag/store/create",
            json=create_request,
            headers=headers,
            timeout=60.0,
        )
        print(f"[API] POST /api/rag/store/create: {resp.status_code}")
        print(f"  Response: {resp.json()}\n")

    # 4. 搜索文档
    search_request = {
        "query": "5G NR 覆盖预测方法",
        "store_name": "telecom_kb",
        "k": 5,
        "score_threshold": 0.7,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/api/rag/search",
            json=search_request,
            headers=headers,
            timeout=30.0,
        )
        print(f"[API] POST /api/rag/search: {resp.status_code}")
        print(f"  Results: {resp.json()}")


# === 示例10: 批量更新语料 ===
async def example_batch_update():
    """批量更新向量存储中的语料"""
    from agent_framework.rag.service import RAGService
    from agent_framework.rag.loaders import DirectoryLoader, FileLoader
    from agent_framework.rag.embeddings import create_embeddings

    rag_service = RAGService()
    embeddings = create_embeddings(provider="openai")

    # 模拟多个目录的数据
    data_dirs = [
        "./data/protocols",
        "./data/simulations",
        "./data/equipment",
    ]

    total_docs = 0
    for data_dir in data_dirs:
        if os.path.exists(data_dir):
            loader = DirectoryLoader(
                directory=data_dir,
                glob_patterns=["**/*.md", "**/*.txt"],
                chunk_size=1000,
            )

            count = rag_service.update_store(
                store_name="knowledge_base",
                loader=loader,
                embeddings=embeddings,
                clear_existing=False,  # 增量添加
            )
            total_docs += count
            print(f"[Batch Update] Added {count} docs from {data_dir}")

    print(f"[Batch Update] Total added: {total_docs} documents")
    return total_docs


# === 主函数 ===
async def main():
    """运行所有示例"""
    print("=" * 60)
    print("Agent RAG 知识加载示例")
    print("=" * 60)
    print()

    # 示例1-4: 加载器使用
    print("\n--- 示例 1-4: 加载器使用 ---\n")
    try:
        example_file_loader()
    except Exception as e:
        print(f"[FileLoader] Skipped: {e}")

    try:
        example_document_reranker()
    except Exception as e:
        print(f"[DocumentReranker] Skipped: {e}")

    try:
        example_hybrid_reranker()
    except Exception as e:
        print(f"[HybridReranker] Skipped: {e}")

    # 示例5-6: RAGService
    print("\n--- 示例 5-6: RAGService ---\n")
    try:
        await example_rag_service_create_store()
    except Exception as e:
        print(f"[RAGService] Skipped: {e}")

    # 示例7: 完整工作流程
    print("\n--- 示例 7: 完整工作流程 ---\n")
    try:
        await example_full_workflow()
    except Exception as e:
        print(f"[Workflow] Skipped: {e}")

    # 示例8: API 使用
    print("\n--- 示例 8: API 使用 ---\n")
    print("Note: 需要先启动 operator-agent 服务 (python -m operator_agent.api.server)")
    print("curl 测试命令:")
    print('  curl -X POST http://localhost:8080/api/rag/reranker/set?strategy=hybrid \\')
    print('       -H "X-API-Key: your-key"')
    print()
    print('  curl -X POST http://localhost:8080/api/rag/store/create \\')
    print('       -H "Content-Type: application/json" -H "X-API-Key: your-key" \\')
    print('       -d \'{"store_name":"kb","loader":{"name":"docs","loader_type":"directory","path":"./data","recursive":true}}\'')

    print("\n" + "=" * 60)
    print("示例完成")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
