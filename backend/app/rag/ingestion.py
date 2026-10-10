"""
Document ingestion module — Member 1 (Sashank Karn / sashank-karn).

Handles PDF, PPTX, and DOCX parsing with page/slide metadata preservation.
Reports extraction successes and failures. Detects scanned/image-only content.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ExtractedPage:
    """A single page/slide of extracted text with metadata."""
    text: str
    page_number: int
    source_file: str
    file_type: str  # "pdf", "pptx", "docx"
    metadata: dict[str, Any] = field(default_factory=dict)
    is_image_only: bool = False
    extraction_warning: str | None = None


@dataclass
class IngestionResult:
    """Result of ingesting a single document."""
    source_file: str
    file_type: str
    success: bool
    pages: list[ExtractedPage] = field(default_factory=list)
    total_pages: int = 0
    extracted_pages: int = 0
    failed_pages: int = 0
    image_only_pages: int = 0
    error: str | None = None
    warnings: list[str] = field(default_factory=list)


def extract_pdf(file_path: str) -> IngestionResult:
    """
    Extract text from a PDF file with page-level metadata.

    Detects image-only pages (pages with no extractable text) and reports them.
    """
    from PyPDF2 import PdfReader

    result = IngestionResult(
        source_file=os.path.basename(file_path),
        file_type="pdf",
        success=False,
    )

    try:
        reader = PdfReader(file_path)
        result.total_pages = len(reader.pages)

        for i, page in enumerate(reader.pages, start=1):
            try:
                text = page.extract_text() or ""
                text = text.strip()

                is_image_only = len(text) < 20  # Heuristic: very little text
                if is_image_only:
                    result.image_only_pages += 1
                    warning = f"Page {i}: appears to be image-only or scanned (extracted {len(text)} chars)"
                    result.warnings.append(warning)
                    logger.warning(f"[{result.source_file}] {warning}")

                extracted = ExtractedPage(
                    text=text,
                    page_number=i,
                    source_file=result.source_file,
                    file_type="pdf",
                    is_image_only=is_image_only,
                    extraction_warning=warning if is_image_only else None,
                    metadata={
                        "total_pages": result.total_pages,
                        "file_path": file_path,
                    },
                )
                result.pages.append(extracted)
                if text:
                    result.extracted_pages += 1
            except Exception as e:
                result.failed_pages += 1
                result.warnings.append(f"Page {i}: extraction failed — {e}")
                logger.error(f"[{result.source_file}] Page {i} failed: {e}")

        result.success = True
    except Exception as e:
        result.error = str(e)
        logger.error(f"Failed to read PDF {file_path}: {e}")

    return result


def extract_pptx(file_path: str) -> IngestionResult:
    """
    Extract text from a PPTX file with slide-level metadata.

    Extracts text from all shapes (text frames, tables, group shapes).
    Detects image-only slides.
    """
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE

    result = IngestionResult(
        source_file=os.path.basename(file_path),
        file_type="pptx",
        success=False,
    )

    try:
        prs = Presentation(file_path)
        result.total_pages = len(prs.slides)

        for i, slide in enumerate(prs.slides, start=1):
            try:
                texts: list[str] = []

                for shape in slide.shapes:
                    # Text frames (titles, body, etc.)
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            para_text = paragraph.text.strip()
                            if para_text:
                                texts.append(para_text)

                    # Tables
                    if shape.has_table:
                        for row in shape.table.rows:
                            row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                            if row_texts:
                                texts.append(" | ".join(row_texts))

                    # Group shapes (nested)
                    if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                        for grouped in shape.shapes:
                            if grouped.has_text_frame:
                                for paragraph in grouped.text_frame.paragraphs:
                                    para_text = paragraph.text.strip()
                                    if para_text:
                                        texts.append(para_text)

                combined_text = "\n".join(texts)
                is_image_only = len(combined_text.strip()) < 10

                if is_image_only:
                    result.image_only_pages += 1
                    warning = f"Slide {i}: appears to be image-only ({len(combined_text)} chars extracted)"
                    result.warnings.append(warning)

                slide_title = ""
                if slide.shapes.title:
                    slide_title = slide.shapes.title.text

                extracted = ExtractedPage(
                    text=combined_text,
                    page_number=i,
                    source_file=result.source_file,
                    file_type="pptx",
                    is_image_only=is_image_only,
                    extraction_warning=warning if is_image_only else None,
                    metadata={
                        "total_slides": result.total_pages,
                        "slide_title": slide_title,
                        "file_path": file_path,
                    },
                )
                result.pages.append(extracted)
                if combined_text.strip():
                    result.extracted_pages += 1
            except Exception as e:
                result.failed_pages += 1
                result.warnings.append(f"Slide {i}: extraction failed — {e}")
                logger.error(f"[{result.source_file}] Slide {i} failed: {e}")

        result.success = True
    except Exception as e:
        result.error = str(e)
        logger.error(f"Failed to read PPTX {file_path}: {e}")

    return result


def extract_docx(file_path: str) -> IngestionResult:
    """
    Extract text from a DOCX file with section-level metadata.

    Extracts text from paragraphs and tables.
    """
    from docx import Document

    result = IngestionResult(
        source_file=os.path.basename(file_path),
        file_type="docx",
        success=False,
    )

    try:
        doc = Document(file_path)
        texts: list[str] = []

        # Extract paragraphs
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                texts.append(text)

        # Extract tables
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    texts.append(" | ".join(row_text))

        combined_text = "\n".join(texts)

        # For DOCX we treat the whole document as one "page" since there are
        # no inherent page breaks we can reliably detect
        result.total_pages = 1
        result.extracted_pages = 1 if combined_text.strip() else 0

        if not combined_text.strip():
            result.image_only_pages = 1
            result.warnings.append("Document appears to contain no extractable text")

        extracted = ExtractedPage(
            text=combined_text,
            page_number=1,
            source_file=result.source_file,
            file_type="docx",
            is_image_only=not combined_text.strip(),
            metadata={
                "total_paragraphs": len(doc.paragraphs),
                "total_tables": len(doc.tables),
                "file_path": file_path,
            },
        )
        result.pages.append(extracted)
        result.success = True

    except Exception as e:
        result.error = str(e)
        logger.error(f"Failed to read DOCX {file_path}: {e}")

    return result


SUPPORTED_EXTENSIONS = {".pdf", ".pptx", ".docx"}

_EXTRACTORS = {
    ".pdf": extract_pdf,
    ".pptx": extract_pptx,
    ".docx": extract_docx,
}


def ingest_file(file_path: str) -> IngestionResult:
    """
    Ingest a single document file. Automatically selects the correct parser
    based on file extension.

    Args:
        file_path: Absolute or relative path to the document.

    Returns:
        IngestionResult with extracted pages and metadata.
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext not in _EXTRACTORS:
        return IngestionResult(
            source_file=path.name,
            file_type=ext.lstrip("."),
            success=False,
            error=f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}",
        )

    if not path.exists():
        return IngestionResult(
            source_file=path.name,
            file_type=ext.lstrip("."),
            success=False,
            error=f"File not found: {file_path}",
        )

    logger.info(f"Ingesting {path.name} ({ext})")
    return _EXTRACTORS[ext](str(path))


def ingest_directory(directory: str) -> list[IngestionResult]:
    """
    Ingest all supported documents from a directory.

    Returns a list of IngestionResult, one per file. Files that fail
    are included with success=False and an error message.
    """
    dir_path = Path(directory)
    if not dir_path.is_dir():
        return [
            IngestionResult(
                source_file=str(directory),
                file_type="directory",
                success=False,
                error=f"Not a directory: {directory}",
            )
        ]

    results: list[IngestionResult] = []
    files = sorted(
        f for f in dir_path.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not files:
        logger.warning(f"No supported documents found in {directory}")
        return results

    for file_path in files:
        result = ingest_file(str(file_path))
        results.append(result)

    # Summary log
    success_count = sum(1 for r in results if r.success)
    fail_count = sum(1 for r in results if not r.success)
    logger.info(
        f"Ingestion complete: {success_count} succeeded, {fail_count} failed "
        f"out of {len(results)} files"
    )

    return results
