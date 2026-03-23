"""Telecom simulation vector store for RAG."""

from typing import Any, Dict, List, Optional
from langchain_core.documents import Document

from agent_framework.rag import VectorStoreManager


class TelecomVectorStore:
    """
    Vector store specialized for telecom simulation knowledge.

    Manages documents related to:
    - Network protocols (5G, LTE, VoNR, etc.)
    - Signal processing
    - Network simulation parameters
    - Telecom equipment configurations
    """

    COLLECTION_TELECOM_SIM = "telecom_simulation"
    COLLECTION_NETWORK_PROTOCOLS = "network_protocols"
    COLLECTION_EQUIPMENT = "equipment_configs"

    def __init__(self, vector_manager: VectorStoreManager):
        """
        Initialize the telecom vector store.

        Args:
            vector_manager: VectorStoreManager instance
        """
        self._vector_manager = vector_manager
        self._initialized_collections: List[str] = []

    def setup_collections(self) -> None:
        """Set up all telecom collections in the vector store."""
        from langchain_community.vectorstores import Chroma

        collections = [
            self.COLLECTION_TELECOM_SIM,
            self.COLLECTION_NETWORK_PROTOCOLS,
            self.COLLECTION_EQUIPMENT,
        ]

        for collection in collections:
            if collection not in self._vector_manager.list_stores():
                self._vector_manager.create_chroma(
                    name=collection,
                    collection_name=collection,
                )
                self._initialized_collections.append(collection)

    def add_document(
        self,
        collection: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Add a document to a collection.

        Args:
            collection: Collection name
            content: Document content
            metadata: Document metadata (source, type, etc.)
        """
        doc = Document(page_content=content, metadata=metadata or {})
        self._vector_manager.add_documents(collection, [doc])

    def add_documents(
        self,
        collection: str,
        documents: List[Document],
    ) -> None:
        """
        Add multiple documents to a collection.

        Args:
            collection: Collection name
            documents: List of documents
        """
        self._vector_manager.add_documents(collection, documents)

    def get_collection(self, name: str):
        """Get a collection by name."""
        return self._vector_manager.get_store(name)

    def list_collections(self) -> List[str]:
        """List all initialized collections."""
        return self._initialized_collections.copy()


class TelecomDocumentBuilder:
    """
    Helper class for building telecom simulation documents.

    Provides templates for common telecom knowledge types.
    """

    @staticmethod
    def build_protocol_doc(
        protocol_name: str,
        description: str,
        parameters: Dict[str, Any],
        standards: Optional[List[str]] = None,
    ) -> Document:
        """
        Build a network protocol document.

        Args:
            protocol_name: Name of the protocol (e.g., "VoNR", "5G NR")
            description: Protocol description
            parameters: Key protocol parameters
            standards: Related standards (3GPP, etc.)
        Returns:
            Document
        """
        content = f"""
# {protocol_name}

## Description
{description}

## Key Parameters
{chr(10).join(f"- {k}: {v}" for k, v in parameters.items())}

## Related Standards
{chr(10).join(f"- {s}" for s in standards) if standards else "None specified"}
"""
        return Document(
            page_content=content,
            metadata={
                "type": "protocol",
                "name": protocol_name,
                "category": "network_protocols",
            },
        )

    @staticmethod
    def build_simulation_config_doc(
        simulation_name: str,
        network_type: str,
        config_params: Dict[str, Any],
        expected_results: Optional[Dict[str, Any]] = None,
    ) -> Document:
        """
        Build a simulation configuration document.

        Args:
            simulation_name: Name of the simulation
            network_type: Type of network (5G, LTE, etc.)
            config_params: Simulation configuration parameters
            expected_results: Expected simulation results
        Returns:
            Document
        """
        content = f"""
# Simulation: {simulation_name}

## Network Type
{network_type}

## Configuration Parameters
{chr(10).join(f"- {k}: {v}" for k, v in config_params.items())}

## Expected Results
{chr(10).join(f"- {k}: {v}" for k, v in expected_results.items()) if expected_results else "Not specified"}
"""
        return Document(
            page_content=content,
            metadata={
                "type": "simulation_config",
                "name": simulation_name,
                "network_type": network_type,
                "category": "telecom_simulation",
            },
        )

    @staticmethod
    def build_equipment_doc(
        equipment_name: str,
        equipment_type: str,
        specifications: Dict[str, Any],
        supported_protocols: Optional[List[str]] = None,
    ) -> Document:
        """
        Build an equipment configuration document.

        Args:
            equipment_name: Name of the equipment
            equipment_type: Type (gNB, eNB, etc.)
            specifications: Equipment specifications
            supported_protocols: List of supported protocols
        Returns:
            Document
        """
        content = f"""
# Equipment: {equipment_name}

## Type
{equipment_type}

## Specifications
{chr(10).join(f"- {k}: {v}" for k, v in specifications.items())}

## Supported Protocols
{chr(10).join(f"- {p}" for p in supported_protocols) if supported_protocols else "None specified"}
"""
        return Document(
            page_content=content,
            metadata={
                "type": "equipment",
                "name": equipment_name,
                "equipment_type": equipment_type,
                "category": "equipment_configs",
            },
        )
