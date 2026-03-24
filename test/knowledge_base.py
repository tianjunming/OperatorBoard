"""Knowledge Base implementation with RAG functionality"""
import os
from typing import Any, Dict, List, Optional
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from framework.knowledge_manager import BaseKnowledgeManager
from config import KNOWLEDGE_BASE_PATH, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP


class KnowledgeManager(BaseKnowledgeManager):
    """Knowledge manager with RAG capabilities"""

    def __init__(
        self,
        embeddings_model: str = EMBEDDING_MODEL,
        chunk_size: int = CHUNK_SIZE,
        chunk_overlap: int = CHUNK_OVERLAP,
        persist_directory: Optional[str] = None,
    ):
        super().__init__()
        self.embeddings = OpenAIEmbeddings(model=embeddings_model)
        self.vectorstore = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
        )
        self.persist_directory = persist_directory

    def load_knowledge(self, directory: str = None) -> None:
        """Load documents from a knowledge directory"""
        load_dir = directory or KNOWLEDGE_BASE_PATH

        if not os.path.exists(load_dir):
            os.makedirs(load_dir, exist_ok=True)
            sample_path = os.path.join(load_dir, "sample.txt")
            with open(sample_path, "w", encoding="utf-8") as f:
                f.write("Sample Knowledge Base\n\nThis is a sample document for testing RAG functionality.")
            print(f"Created sample knowledge base at {load_dir}")

        loader = DirectoryLoader(
            load_dir,
            glob="**/*.txt",
            loader_cls=TextLoader,
        )
        documents = loader.load()

        if not documents:
            print("No documents found in knowledge base.")
            return

        chunks = self.text_splitter.split_documents(documents)
        self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        print(f"Loaded {len(chunks)} chunks from knowledge base.")

    def search(self, query: str, top_k: int = 3) -> List[str]:
        """Search the knowledge base for relevant information"""
        if not self.vectorstore:
            self.load_knowledge()

        if not self.vectorstore:
            return []

        results = self.vectorstore.similarity_search(query, k=top_k)
        return [doc.page_content for doc in results]

    def add_knowledge(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add a new document to the knowledge base"""
        doc = Document(page_content=content, metadata=metadata or {})
        chunks = self.text_splitter.split_documents([doc])

        if not self.vectorstore:
            self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
        else:
            self.vectorstore.add_documents(chunks)

    def clear(self) -> None:
        """Clear all knowledge"""
        self.vectorstore = None

    def save(self, directory: str = None) -> None:
        """Save the vectorstore to disk"""
        save_dir = directory or self.persist_directory
        if self.vectorstore and save_dir:
            self.vectorstore.save_local(save_dir)

    def load(self, directory: str) -> None:
        """Load the vectorstore from disk"""
        if os.path.exists(directory):
            self.vectorstore = FAISS.load_local(
                directory,
                self.embeddings,
                allow_dangerous_deserialization=True,
            )


# Global instance for backward compatibility
knowledge_manager = KnowledgeManager()
