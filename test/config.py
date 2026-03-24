"""Configuration for the LangChain Agent with RAG"""
import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI API Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-api-key-here")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# RAG Configuration
KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "knowledge")
EMBEDDING_MODEL = "text-embedding-3-small"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Agent Configuration
VERBOSE = True
MAX_ITERATIONS = 10
