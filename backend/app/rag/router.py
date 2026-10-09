"""
RAG API router — Member 4 (Prabin / Prabin-yadav).

FastAPI endpoints for document ingestion, querying, and pipeline status.
Integrates the RAG pipeline into the existing StayOps AI backend.
"""
from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG Pipeline"])

# Uploads directory for temporarily storing uploaded files
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))),
    "uploads",
)

# Default syllabus directory
SYLLABUS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))),
    "syllabus",
)


class QueryRequest(BaseModel):
    """Request body for the /rag/query endpoint."""
    question: str = Field(..., min_length=1, max_length=2000, description="The question to ask")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")


class QueryResponse(BaseModel):
    """Response from the /rag/query endpoint."""
    answer: str
    citations: list[dict[str, Any]]
    is_fallback: bool
    injection_detected: bool
    warnings: list[str]
    chunks_retrieved: int


class IngestResponse(BaseModel):
    """Response from the /rag/ingest endpoint."""
    total_files: int
    successful_files: int
    failed_files: int
    total_pages: int
    total_chunks: int
    chunks_stored: int
    duplicates_skipped: int
    image_only_pages: int
    files: list[dict[str, Any]]
    warnings: list[str]
    errors: list[str]


@router.post("/query", response_model=QueryResponse)
def query_documents(request: QueryRequest) -> QueryResponse:
    """
    Ask a question about the ingested course materials.

    The system retrieves relevant chunks from the vector store, builds context,
    and generates an answer with citations. If no relevant content is found,
    a fallback response is returned.
    """
    from backend.app.rag.pipeline import query as pipeline_query

    try:
        result = pipeline_query(
            question=request.question,
            top_k=request.top_k,
        )
        return QueryResponse(**result)
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")


@router.post("/ingest/upload", response_model=IngestResponse)
async def ingest_uploaded_files(
    files: list[UploadFile] = File(..., description="PDF, PPTX, or DOCX files"),
    chunk_size: int = Query(default=1000, ge=100, le=5000),
    chunk_overlap: int = Query(default=200, ge=0, le=1000),
) -> IngestResponse:
    """
    Upload and ingest document files into the vector store.

    Accepts PDF, PPTX, and DOCX files. Each file is parsed, chunked,
    embedded, and stored in the persistent vector database.
    """
    from backend.app.rag.pipeline import ingest_and_store

    # Save uploaded files
    upload_path = Path(UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    for f in files:
        ext = Path(f.filename or "").suffix.lower()
        if ext not in {".pdf", ".pptx", ".docx"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {f.filename}. Supported: .pdf, .pptx, .docx",
            )

        dest = upload_path / (f.filename or "uploaded_file")
        with open(dest, "wb") as out:
            content = await f.read()
            out.write(content)
        saved_paths.append(str(dest))

    # Ingest all uploaded files
    all_status = None
    for path in saved_paths:
        status = ingest_and_store(
            source_path=path,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        if all_status is None:
            all_status = status
        else:
            # Merge results
            all_status.ingested_files.extend(status.ingested_files)
            all_status.total_files += status.total_files
            all_status.successful_files += status.successful_files
            all_status.failed_files += status.failed_files
            all_status.total_pages += status.total_pages
            all_status.total_chunks += status.total_chunks
            all_status.chunks_stored += status.chunks_stored
            all_status.duplicates_skipped += status.duplicates_skipped
            all_status.image_only_pages += status.image_only_pages
            all_status.warnings.extend(status.warnings)
            all_status.errors.extend(status.errors)

    if all_status is None:
        raise HTTPException(status_code=400, detail="No files processed")

    return IngestResponse(
        total_files=all_status.total_files,
        successful_files=all_status.successful_files,
        failed_files=all_status.failed_files,
        total_pages=all_status.total_pages,
        total_chunks=all_status.total_chunks,
        chunks_stored=all_status.chunks_stored,
        duplicates_skipped=all_status.duplicates_skipped,
        image_only_pages=all_status.image_only_pages,
        files=all_status.ingested_files,
        warnings=all_status.warnings,
        errors=all_status.errors,
    )


@router.post("/ingest/syllabus", response_model=IngestResponse)
def ingest_syllabus(
    chunk_size: int = Query(default=1000, ge=100, le=5000),
    chunk_overlap: int = Query(default=200, ge=0, le=1000),
) -> IngestResponse:
    """
    Ingest the course syllabus from the project's syllabus/ directory.

    This is a convenience endpoint that processes all supported documents
    in the syllabus/ directory.
    """
    from backend.app.rag.pipeline import ingest_and_store

    if not os.path.isdir(SYLLABUS_DIR):
        raise HTTPException(
            status_code=404,
            detail=f"Syllabus directory not found: {SYLLABUS_DIR}",
        )

    status = ingest_and_store(
        source_path=SYLLABUS_DIR,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    return IngestResponse(
        total_files=status.total_files,
        successful_files=status.successful_files,
        failed_files=status.failed_files,
        total_pages=status.total_pages,
        total_chunks=status.total_chunks,
        chunks_stored=status.chunks_stored,
        duplicates_skipped=status.duplicates_skipped,
        image_only_pages=status.image_only_pages,
        files=status.ingested_files,
        warnings=status.warnings,
        errors=status.errors,
    )


@router.get("/status")
def pipeline_status() -> dict[str, Any]:
    """
    Get the current status of the RAG pipeline, including vector store statistics.
    """
    from backend.app.rag.vectorstore import get_store_stats

    stats = get_store_stats()

    return {
        "pipeline": "operational",
        "vectorstore": stats,
        "syllabus_dir_exists": os.path.isdir(SYLLABUS_DIR),
        "syllabus_files": (
            [f.name for f in Path(SYLLABUS_DIR).iterdir() if f.is_file()]
            if os.path.isdir(SYLLABUS_DIR)
            else []
        ),
    }
