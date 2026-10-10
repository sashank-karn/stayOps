"""
StayOps AI — FastAPI application entrypoint.

Phase 1 scope: a runnable app with health/readiness endpoints so every team member
can verify their environment works. Routers, auth, and agent endpoints are added in
later phases.

Run from the repository root:
    uvicorn backend.app.main:app --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Multi-agent AI system for autonomous PG and co-living operations.",
    debug=settings.app_debug,
)

# Include the RAG pipeline router
from backend.app.rag.router import router as rag_router
app.include_router(rag_router)

# CORS so the Next.js dashboard can call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["meta"])
def root() -> dict:
    """Service banner."""
    return {
        "service": settings.app_name,
        "version": "0.1.0",
        "environment": settings.app_env,
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe — process is up."""
    return {"status": "ok"}


@app.get("/readiness", tags=["meta"])
def readiness() -> dict:
    """
    Readiness probe. In Phase 2 this will also check the database connection.
    For now it reports which LLM provider is configured (without leaking keys).
    """
    return {
        "status": "ready",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "llm_key_configured": settings.has_llm_key(),
    }
