"""
Persistent vector store module — Member 2 (Sonali / Sona1147).

Uses ChromaDB for persistent vector storage with duplicate prevention,
metadata storage, and efficient retrieval.
"""
from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Default persist directory relative to the repo root
DEFAULT_PERSIST_DIR = str(Path(__file__).resolve().parents[3] / "chroma_db")
DEFAULT_COLLECTION_NAME = "course_materials"


def _content_hash(text: str) -> str:
    """Generate a deterministic hash for content-based deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def get_vectorstore(
    collection_name: str = DEFAULT_COLLECTION_NAME,
    persist_directory: str | None = None,
    embedding_function=None,
):
    """
    Get or create a persistent ChromaDB vector store.

    Args:
        collection_name: Name of the ChromaDB collection.
        persist_directory: Directory to persist the database.
        embedding_function: LangChain embedding function. If None, uses default
            from the embeddings module.

    Returns:
        A LangChain Chroma vector store instance.
    """
    import chromadb
    from langchain_community.vectorstores import Chroma

    if persist_directory is None:
        persist_directory = DEFAULT_PERSIST_DIR

    if embedding_function is None:
        from backend.app.rag.embeddings import get_embedding_function
        embedding_function = get_embedding_function()

    # Ensure directory exists
    Path(persist_directory).mkdir(parents=True, exist_ok=True)

    logger.info(
        f"Opening ChromaDB: collection={collection_name}, "
        f"persist_dir={persist_directory}"
    )

    vectorstore = Chroma(
        collection_name=collection_name,
        embedding_function=embedding_function,
        persist_directory=persist_directory,
    )

    return vectorstore


def add_chunks_to_store(
    chunks: list,  # list[TextChunk]
    collection_name: str = DEFAULT_COLLECTION_NAME,
    persist_directory: str | None = None,
    embedding_function=None,
    batch_size: int = 100,
) -> dict[str, Any]:
    """
    Add text chunks to the vector store with duplicate prevention.

    Each chunk gets a content-based ID so re-ingesting the same document
    doesn't create duplicates.

    Args:
        chunks: List of TextChunk objects from the chunking module.
        collection_name: ChromaDB collection name.
        persist_directory: Where to persist the database.
        embedding_function: Embedding function to use.
        batch_size: Number of chunks to add per batch.

    Returns:
        A dict with ingestion statistics.
    """
    if not chunks:
        return {"added": 0, "skipped": 0, "total": 0}

    vectorstore = get_vectorstore(
        collection_name=collection_name,
        persist_directory=persist_directory,
        embedding_function=embedding_function,
    )

    # Check for existing IDs to prevent duplicates
    existing_ids = set()
    try:
        collection = vectorstore._collection
        existing_data = collection.get()
        if existing_data and existing_data.get("ids"):
            existing_ids = set(existing_data["ids"])
    except Exception as e:
        logger.warning(f"Could not check existing IDs: {e}")

    texts: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []
    skipped = 0

    for chunk in chunks:
        chunk_id = f"{chunk.source_file}_{chunk.page_number}_{_content_hash(chunk.text)}"

        if chunk_id in existing_ids:
            skipped += 1
            continue

        texts.append(chunk.text)
        metadatas.append({
            "source_file": chunk.source_file,
            "page_number": chunk.page_number,
            "file_type": chunk.file_type,
            "chunk_index": chunk.chunk_index,
            **{k: str(v) for k, v in chunk.metadata.items()},
        })
        ids.append(chunk_id)

    added = 0
    if texts:
        # Add in batches
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_metas = metadatas[i : i + batch_size]
            batch_ids = ids[i : i + batch_size]
            vectorstore.add_texts(
                texts=batch_texts,
                metadatas=batch_metas,
                ids=batch_ids,
            )
            added += len(batch_texts)

    result = {
        "added": added,
        "skipped": skipped,
        "total": added + skipped,
    }
    logger.info(
        f"Vector store update: {added} added, {skipped} duplicates skipped"
    )
    return result


def get_store_stats(
    collection_name: str = DEFAULT_COLLECTION_NAME,
    persist_directory: str | None = None,
) -> dict[str, Any]:
    """
    Get statistics about the current vector store.

    Returns:
        Dict with collection count, unique sources, etc.
    """
    import chromadb

    if persist_directory is None:
        persist_directory = DEFAULT_PERSIST_DIR

    try:
        client = chromadb.PersistentClient(path=persist_directory)
        collection = client.get_or_create_collection(collection_name)
        count = collection.count()

        # Get unique sources
        result = collection.get(include=["metadatas"])
        sources = set()
        if result and result.get("metadatas"):
            for meta in result["metadatas"]:
                if meta and "source_file" in meta:
                    sources.add(meta["source_file"])

        return {
            "collection": collection_name,
            "total_chunks": count,
            "unique_sources": sorted(sources),
            "source_count": len(sources),
        }
    except Exception as e:
        return {"error": str(e)}
