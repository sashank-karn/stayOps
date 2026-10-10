"""
Text chunking module — Member 2 (Sonali / Sona1147).

Configurable text splitting with overlap for optimal retrieval performance.
Preserves source metadata through the chunking process.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# Defaults tuned for course material (lectures, notes, slides)
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


@dataclass
class TextChunk:
    """A chunk of text with preserved source metadata."""
    text: str
    chunk_index: int
    source_file: str
    page_number: int
    file_type: str
    metadata: dict[str, Any] = field(default_factory=dict)


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
    separators: list[str] | None = None,
) -> list[str]:
    """
    Split text into chunks with overlap using recursive character splitting.

    Args:
        text: The text to split.
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Number of overlapping characters between consecutive chunks.
        separators: Ordered list of separators to try for splitting.

    Returns:
        List of text chunks.
    """
    if not text or not text.strip():
        return []

    if separators is None:
        separators = DEFAULT_SEPARATORS

    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=separators,
        length_function=len,
        is_separator_regex=False,
    )

    return splitter.split_text(text)


def chunk_pages(
    pages: list,  # list[ExtractedPage] — avoid circular import
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[TextChunk]:
    """
    Chunk a list of ExtractedPage objects into TextChunks with preserved metadata.

    Skips image-only pages and empty pages. Each chunk retains the source file,
    page number, and file type from its source page.

    Args:
        pages: List of ExtractedPage from the ingestion module.
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Overlap between chunks.

    Returns:
        List of TextChunk objects ready for embedding.
    """
    all_chunks: list[TextChunk] = []
    chunk_index = 0

    for page in pages:
        text = page.text.strip()
        if not text:
            logger.debug(
                f"Skipping empty page {page.page_number} from {page.source_file}"
            )
            continue

        if page.is_image_only:
            logger.debug(
                f"Skipping image-only page {page.page_number} from {page.source_file}"
            )
            continue

        raw_chunks = chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        for raw in raw_chunks:
            tc = TextChunk(
                text=raw,
                chunk_index=chunk_index,
                source_file=page.source_file,
                page_number=page.page_number,
                file_type=page.file_type,
                metadata={
                    **page.metadata,
                    "chunk_size": chunk_size,
                    "chunk_overlap": chunk_overlap,
                },
            )
            all_chunks.append(tc)
            chunk_index += 1

    logger.info(
        f"Chunked {len(pages)} pages into {len(all_chunks)} chunks "
        f"(size={chunk_size}, overlap={chunk_overlap})"
    )
    return all_chunks
