"""
Tests for chunking module — Member 2 (Sonali / Sona1147).

Tests configurable text splitting, overlap, and metadata preservation.
"""
from __future__ import annotations

import pytest

from backend.app.rag.chunking import TextChunk, chunk_text, chunk_pages


class TestChunkText:
    """Tests for the chunk_text function."""

    def test_empty_text_returns_empty(self):
        """Empty or whitespace text returns no chunks."""
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_short_text_single_chunk(self):
        """Text shorter than chunk_size returns one chunk."""
        text = "This is a short sentence about AI agents."
        chunks = chunk_text(text, chunk_size=500, chunk_overlap=50)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_multiple_chunks(self):
        """Long text is split into multiple chunks."""
        text = "Word " * 500  # ~2500 chars
        chunks = chunk_text(text, chunk_size=200, chunk_overlap=50)
        assert len(chunks) > 1

    def test_chunk_size_respected(self):
        """Each chunk is within the specified size limit (approximately)."""
        text = "Sentence. " * 200
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=20)
        for chunk in chunks:
            # Allow some tolerance for boundary splitting
            assert len(chunk) <= 150  # chunk_size + tolerance

    def test_overlap_creates_redundancy(self):
        """Chunks with overlap share content at boundaries."""
        text = "A " * 100 + "B " * 100 + "C " * 100
        chunks_with_overlap = chunk_text(text, chunk_size=100, chunk_overlap=50)
        chunks_no_overlap = chunk_text(text, chunk_size=100, chunk_overlap=0)
        # More chunks with overlap due to shared content
        assert len(chunks_with_overlap) >= len(chunks_no_overlap)

    def test_configurable_chunk_size(self):
        """Different chunk sizes produce different numbers of chunks."""
        text = "Word " * 500
        small = chunk_text(text, chunk_size=100, chunk_overlap=0)
        large = chunk_text(text, chunk_size=500, chunk_overlap=0)
        assert len(small) > len(large)


class TestChunkPages:
    """Tests for the chunk_pages function using mock ExtractedPage objects."""

    def _make_page(self, text, page_number=1, source_file="test.pdf",
                   file_type="pdf", is_image_only=False):
        """Create a mock ExtractedPage-like object."""
        from backend.app.rag.ingestion import ExtractedPage
        return ExtractedPage(
            text=text,
            page_number=page_number,
            source_file=source_file,
            file_type=file_type,
            is_image_only=is_image_only,
            metadata={"test": True},
        )

    def test_chunk_pages_preserves_metadata(self):
        """Chunks retain source file and page number from their pages."""
        page = self._make_page(
            "This is a long test page with enough content. " * 50,
            page_number=3,
            source_file="lecture.pdf",
        )
        chunks = chunk_pages([page], chunk_size=200, chunk_overlap=50)
        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk.source_file == "lecture.pdf"
            assert chunk.page_number == 3
            assert chunk.file_type == "pdf"

    def test_chunk_pages_skips_empty(self):
        """Empty pages are skipped."""
        pages = [
            self._make_page(""),
            self._make_page("   "),
            self._make_page("Real content here about AI systems."),
        ]
        chunks = chunk_pages(pages, chunk_size=500)
        assert len(chunks) == 1

    def test_chunk_pages_skips_image_only(self):
        """Image-only pages are skipped."""
        pages = [
            self._make_page("Some text", is_image_only=True),
            self._make_page("Good content about multi-agent systems."),
        ]
        chunks = chunk_pages(pages, chunk_size=500)
        assert len(chunks) == 1
        assert chunks[0].text == "Good content about multi-agent systems."

    def test_chunk_pages_multiple_sources(self):
        """Chunks from different source files maintain correct attribution."""
        pages = [
            self._make_page("Content from file A. " * 20, source_file="fileA.pdf", page_number=1),
            self._make_page("Content from file B. " * 20, source_file="fileB.pptx", page_number=5),
        ]
        chunks = chunk_pages(pages, chunk_size=100, chunk_overlap=20)
        a_chunks = [c for c in chunks if c.source_file == "fileA.pdf"]
        b_chunks = [c for c in chunks if c.source_file == "fileB.pptx"]
        assert len(a_chunks) > 0
        assert len(b_chunks) > 0
        assert all(c.page_number == 1 for c in a_chunks)
        assert all(c.page_number == 5 for c in b_chunks)
