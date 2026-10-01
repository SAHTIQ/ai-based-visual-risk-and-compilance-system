from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class RetrievalStatus(BaseModel):
    is_operational: bool = False
    status_label: str = "Pending Document Indexing"
    description: str = (
        "RAG retrieval architecture is ready. Awaiting ingestion and embedding of personal notes, "
        "productivity guidelines, and lifestyle documentation."
    )
    indexed_documents_count: int = 0


class WebResearchStatus(BaseModel):
    is_operational: bool = False
    status_label: str = "Pending Search API Configuration"
    description: str = (
        "Web research connector interface is ready. Requires external search provider API keys "
        "(e.g., Tavily or Bing Web Search) before live citations can be retrieved."
    )


class RAGPipelineService:
    """
    Architecture readiness interface for Retrieval-Augmented Generation (RAG).
    Provides honest status reporting and prepared hooks for vector retrieval
    without simulating fake citations or false execution.
    """

    def __init__(self):
        self._retrieval_status = RetrievalStatus()
        self._web_status = WebResearchStatus()

    def get_readiness_meta(self) -> Dict[str, Any]:
        return {
            "rag_retrieval": self._retrieval_status.model_dump(),
            "web_research": self._web_status.model_dump(),
        }

    def retrieve_relevant_documents(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Prepared retrieval hook. Returns empty list with zero false citations
        until a vector store is populated.
        """
        # When vector database (e.g. pgvector or ChromaDB) is attached, execute similarity search here.
        return []

    def perform_web_search(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Prepared web research hook. Returns None until search provider key is configured.
        """
        return None


rag_service = RAGPipelineService()
