"""
Tests for the RAG ingestion module — Member 1 (Sashank Karn / sashank-karn).

Tests document parsing for PDF, PPTX, and DOCX formats, including error
handling, metadata preservation, and image-only detection.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest


# ---------- Helpers to create test documents ----------

def _create_test_pdf(path: str, pages: int = 3) -> str:
    """Create a simple test PDF with text on each page."""
    from PyPDF2 import PdfWriter
    from io import BytesIO
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    try:
        # Use reportlab if available for proper text PDFs
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        for i in range(pages):
            c.drawString(72, 700, f"Test page {i + 1} content. This is sample course material.")
            c.drawString(72, 680, f"More content on page {i + 1} about agentic AI concepts.")
            c.showPage()
        c.save()
        buf.seek(0)
        with open(path, "wb") as f:
            f.write(buf.read())
    except ImportError:
        # Fallback: use PyPDF2 (creates minimal PDF, less text)
        writer = PdfWriter()
        for i in range(pages):
            writer.add_blank_page(width=612, height=792)
        with open(path, "wb") as f:
            writer.write(f)
    return path


def _create_test_pptx(path: str, slides: int = 3) -> str:
    """Create a simple test PPTX with text on each slide."""
    from pptx import Presentation

    prs = Presentation()
    for i in range(slides):
        slide = prs.slides.add_slide(prs.slide_layouts[1])  # Title + Content
        slide.shapes.title.text = f"Slide {i + 1}: Agentic AI"
        body = slide.placeholders[1]
        body.text = f"Content for slide {i + 1}. Covers agent architectures and RAG pipelines."
    prs.save(path)
    return path


def _create_test_docx(path: str) -> str:
    """Create a simple test DOCX with paragraphs."""
    from docx import Document

    doc = Document()
    doc.add_heading("Agentic AI Course Syllabus", 0)
    doc.add_paragraph("This document covers the fundamentals of agentic AI systems.")
    doc.add_paragraph("Topics include multi-agent architectures, RAG pipelines, and tool use.")
    doc.add_paragraph("Session 1: Introduction to agents and autonomous systems.")
    doc.save(path)
    return path


# ---------- Tests ----------

class TestPDFExtraction:
    """Tests for PDF document extraction."""

    def test_extract_pdf_success(self, tmp_path):
        """PDF extraction returns pages with metadata."""
        from backend.app.rag.ingestion import extract_pdf

        pdf_path = str(tmp_path / "test.pdf")
        try:
            _create_test_pdf(pdf_path, pages=2)
        except ImportError:
            pytest.skip("reportlab not installed; skipping PDF creation test")

        result = extract_pdf(pdf_path)
        assert result.success is True
        assert result.total_pages == 2
        assert result.source_file == "test.pdf"
        assert result.file_type == "pdf"
        assert len(result.pages) == 2
        for page in result.pages:
            assert page.source_file == "test.pdf"
            assert page.file_type == "pdf"

    def test_extract_pdf_missing_file(self):
        """PDF extraction fails gracefully for missing files."""
        from backend.app.rag.ingestion import extract_pdf
        result = extract_pdf("nonexistent.pdf")
        assert result.success is False
        assert result.error is not None

    def test_extract_pdf_metadata_preserved(self, tmp_path):
        """Each page carries source metadata."""
        from backend.app.rag.ingestion import extract_pdf

        pdf_path = str(tmp_path / "meta_test.pdf")
        try:
            _create_test_pdf(pdf_path, pages=1)
        except ImportError:
            pytest.skip("reportlab not installed")

        result = extract_pdf(pdf_path)
        assert result.success is True
        page = result.pages[0]
        assert page.page_number == 1
        assert "total_pages" in page.metadata


class TestPPTXExtraction:
    """Tests for PPTX document extraction."""

    def test_extract_pptx_success(self, tmp_path):
        """PPTX extraction returns slides with metadata."""
        from backend.app.rag.ingestion import extract_pptx

        pptx_path = str(tmp_path / "test.pptx")
        _create_test_pptx(pptx_path, slides=3)

        result = extract_pptx(pptx_path)
        assert result.success is True
        assert result.total_pages == 3
        assert result.source_file == "test.pptx"
        assert result.file_type == "pptx"
        assert len(result.pages) == 3

    def test_extract_pptx_slide_title(self, tmp_path):
        """Slide titles are preserved in metadata."""
        from backend.app.rag.ingestion import extract_pptx

        pptx_path = str(tmp_path / "title_test.pptx")
        _create_test_pptx(pptx_path, slides=1)

        result = extract_pptx(pptx_path)
        assert result.success is True
        page = result.pages[0]
        assert "slide_title" in page.metadata
        assert "Agentic AI" in page.metadata["slide_title"]

    def test_extract_pptx_missing_file(self):
        """PPTX extraction fails gracefully for missing files."""
        from backend.app.rag.ingestion import extract_pptx
        result = extract_pptx("nonexistent.pptx")
        assert result.success is False
        assert result.error is not None


class TestDOCXExtraction:
    """Tests for DOCX document extraction."""

    def test_extract_docx_success(self, tmp_path):
        """DOCX extraction returns content with metadata."""
        from backend.app.rag.ingestion import extract_docx

        docx_path = str(tmp_path / "test.docx")
        _create_test_docx(docx_path)

        result = extract_docx(docx_path)
        assert result.success is True
        assert result.total_pages == 1  # DOCX treated as single page
        assert result.source_file == "test.docx"
        assert len(result.pages) == 1
        assert "Agentic AI" in result.pages[0].text

    def test_extract_docx_missing_file(self):
        """DOCX extraction fails gracefully for missing files."""
        from backend.app.rag.ingestion import extract_docx
        result = extract_docx("nonexistent.docx")
        assert result.success is False
        assert result.error is not None


class TestFileIngestion:
    """Tests for the unified ingest_file function."""

    def test_ingest_unsupported_type(self, tmp_path):
        """Unsupported file types return clear error."""
        from backend.app.rag.ingestion import ingest_file
        result = ingest_file(str(tmp_path / "test.txt"))
        assert result.success is False
        assert "Unsupported" in result.error

    def test_ingest_file_not_found(self):
        """Missing file returns clear error."""
        from backend.app.rag.ingestion import ingest_file
        result = ingest_file("this_file_does_not_exist.pdf")
        assert result.success is False
        assert "not found" in result.error.lower() or "Unsupported" in result.error


class TestDirectoryIngestion:
    """Tests for directory-level ingestion."""

    def test_ingest_directory_with_mixed_files(self, tmp_path):
        """Directory ingestion processes all supported files."""
        from backend.app.rag.ingestion import ingest_directory

        _create_test_pptx(str(tmp_path / "slides.pptx"), slides=2)
        _create_test_docx(str(tmp_path / "notes.docx"))
        # Also create an unsupported file that should be ignored
        (tmp_path / "readme.txt").write_text("not a document")

        results = ingest_directory(str(tmp_path))
        assert len(results) == 2  # Only .pptx and .docx
        assert all(r.success for r in results)

    def test_ingest_nonexistent_directory(self):
        """Non-existent directory returns error."""
        from backend.app.rag.ingestion import ingest_directory
        results = ingest_directory("/nonexistent/path")
        assert len(results) == 1
        assert results[0].success is False
