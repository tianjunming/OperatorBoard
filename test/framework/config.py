"""Framework Configuration"""
import os
from dotenv import load_dotenv

load_dotenv()

# Default OpenAI Configuration
DEFAULT_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# Default RAG Configuration
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 50

# Default Agent Configuration
DEFAULT_VERBOSE = True
DEFAULT_MAX_ITERATIONS = 10
