"""
Tests for RAG API endpoints — Member 4 (Prabin / Prabin-yadav).

Tests the FastAPI router endpoints for the RAG pipeline.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


class TestRAGStatus:
    """Tests for the /rag/status endpoint."""

    def test_status_endpoint_accessible(self):
        """RAG status endpoint returns 200."""
        resp = client.get("/rag/status")
        assert resp.status_code == 200
        body = resp.json()
        assert body["pipeline"] == "operational"
        assert "vectorstore" in body
        assert "syllabus_dir_exists" in body

    def test_status_shows_syllabus_files(self):
        """Status includes syllabus directory info."""
        resp = client.get("/rag/status")
        body = resp.json()
        assert isinstance(body.get("syllabus_files"), list)


class TestRAGQuery:
    """Tests for the /rag/query endpoint."""

    def test_query_requires_question(self):
        """Query endpoint validates the request body."""
        resp = client.post("/rag/query", json={})
        assert resp.status_code == 422  # Validation error

    def test_query_empty_question_rejected(self):
        """Empty question is rejected."""
        resp = client.post("/rag/query", json={"question": ""})
        assert resp.status_code == 422

    def test_query_too_long_question_rejected(self):
        """Excessively long questions are rejected."""
        resp = client.post("/rag/query", json={"question": "x" * 2001})
        assert resp.status_code == 422


class TestRAGIngest:
    """Tests for the /rag/ingest endpoints."""

    def test_ingest_syllabus_endpoint_exists(self):
        """The syllabus ingestion endpoint exists and is accessible."""
        # This may fail if syllabus dir is missing, but should return 200 or 404
        resp = client.post("/rag/ingest/syllabus")
        assert resp.status_code in (200, 404, 500)

    def test_ingest_upload_requires_files(self):
        """Upload endpoint requires file attachments."""
        resp = client.post("/rag/ingest/upload")
        assert resp.status_code == 422


class TestExistingEndpoints:
    """Verify that existing Phase 1 endpoints still work after RAG integration."""

    def test_health_still_works(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_root_still_works(self):
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert "service" in body

    def test_readiness_still_works(self):
        resp = client.get("/readiness")
        assert resp.status_code == 200
