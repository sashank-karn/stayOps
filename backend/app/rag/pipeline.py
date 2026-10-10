"""
RAG Pipeline orchestrator — Member 4 (Prabin / Prabin-yadav).

Ties together ingestion → chunking → embedding → storage → retrieval → generation.
Provides a single entry point for the full pipeline and status reporting.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PipelineStatus:
    """Status report for the full RAG pipeline."""
    ingested_files: list[dict[str, Any]] = field(default_factory=list)
    total_files: int = 0
    successful_files: int = 0
    failed_files: int = 0
    total_pages: int = 0
    total_chunks: int = 0
    chunks_stored: int = 0
    duplicates_skipped: int = 0
    image_only_pages: int = 0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def ingest_and_store(
    source_path: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    collection_name: str = "course_materials",
    persist_directory: str | None = None,
) -> PipelineStatus:
    """
    Full ingestion pipeline: parse documents → chunk → embed → store.

    Args:
        source_path: Path to a file or directory of documents.
        chunk_size: Characters per chunk.
        chunk_overlap: Overlap between chunks.
        collection_name: ChromaDB collection name.
        persist_directory: ChromaDB persist directory.

    Returns:
        PipelineStatus with detailed results.
    """
    from backend.app.rag.ingestion import ingest_file, ingest_directory, SUPPORTED_EXTENSIONS
    from backend.app.rag.chunking import chunk_pages
    from backend.app.rag.vectorstore import add_chunks_to_store

    status = PipelineStatus()
    path = Path(source_path)

    # Step 1: Ingest documents
    if path.is_file():
        from backend.app.rag.ingestion import ingest_file
        results = [ingest_file(str(path))]
    elif path.is_dir():
        results = ingest_directory(str(path))
    else:
        status.errors.append(f"Path not found: {source_path}")
        return status

    status.total_files = len(results)

    # Step 2: Process each ingestion result
    all_chunks = []
    for result in results:
        file_info = {
            "file": result.source_file,
            "type": result.file_type,
            "success": result.success,
            "total_pages": result.total_pages,
            "extracted_pages": result.extracted_pages,
            "failed_pages": result.failed_pages,
            "image_only_pages": result.image_only_pages,
        }

        if result.error:
            file_info["error"] = result.error
            status.errors.append(f"{result.source_file}: {result.error}")

        if result.warnings:
            file_info["warnings"] = result.warnings
            status.warnings.extend(result.warnings)

        status.ingested_files.append(file_info)

        if result.success:
            status.successful_files += 1
            status.total_pages += result.total_pages
            status.image_only_pages += result.image_only_pages

            # Chunk the extracted pages
            chunks = chunk_pages(
                result.pages,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
            all_chunks.extend(chunks)
        else:
            status.failed_files += 1

    status.total_chunks = len(all_chunks)

    # Step 3: Store chunks in vector database
    if all_chunks:
        try:
            store_result = add_chunks_to_store(
                chunks=all_chunks,
                collection_name=collection_name,
                persist_directory=persist_directory,
            )
            status.chunks_stored = store_result["added"]
            status.duplicates_skipped = store_result["skipped"]
        except Exception as e:
            status.errors.append(f"Vector store error: {e}")
            logger.error(f"Vector store error: {e}")

    logger.info(
        f"Pipeline complete: {status.successful_files}/{status.total_files} files, "
        f"{status.total_chunks} chunks, {status.chunks_stored} stored"
    )

    return status


def query(
    question: str,
    top_k: int = 5,
    collection_name: str = "course_materials",
    persist_directory: str | None = None,
) -> dict[str, Any]:
    """
    Query the RAG pipeline and return a structured response.

    Args:
        question: The user's question.
        top_k: Number of chunks to retrieve.
        collection_name: ChromaDB collection name.
        persist_directory: ChromaDB persist directory.

    Returns:
        Dict with answer, citations, and metadata.
    """
    from backend.app.rag.retrieval import generate_answer

    response = generate_answer(
        query=question,
        top_k=top_k,
        collection_name=collection_name,
        persist_directory=persist_directory,
    )

    return {
        "answer": response.answer,
        "citations": [
            {
                "source_file": c.source_file,
                "page_number": c.page_number,
                "file_type": c.file_type,
                "relevance_score": round(c.relevance_score, 4),
            }
            for c in response.citations
        ],
        "is_fallback": response.is_fallback,
        "injection_detected": response.injection_detected,
        "warnings": response.warnings,
        "chunks_retrieved": len(response.retrieved_chunks),
    }
