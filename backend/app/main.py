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

# Include the StayOps Multi-Agent Operations router
from backend.app.api.router import router as api_router
app.include_router(api_router)

@app.on_event("startup")
def on_startup():
    """Ensure database tables and sample data are ready on boot."""
    from sqlalchemy import text
    from backend.app.db.session import engine, Base
    from backend.app.db.seed import seed_database
    try:
        Base.metadata.create_all(bind=engine)
        # Ensure is_verified column exists on users table for seamless schema sync
        with engine.begin() as conn:
            try:
                if "sqlite" in str(engine.url):
                    cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
                    if cols and "is_verified" not in cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE"))
            except Exception as mig_err:
                import logging
                logging.getLogger(__name__).debug("Column migration note: %s", mig_err)
        seed_database()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Startup DB init note: %s", e)

# CORS configuration for custom production domain, Vercel deployments, and local development
allowed_origins = [
    "https://stayops.sashankkarn.com.np",
    "https://www.stayops.sashankkarn.com.np",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
]

# Append configured frontend_url if present and not already listed or a wildcard
if settings.frontend_url and settings.frontend_url not in ("*", ""):
    cleaned_frontend_url = settings.frontend_url.rstrip("/")
    if cleaned_frontend_url not in allowed_origins:
        allowed_origins.append(cleaned_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
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
