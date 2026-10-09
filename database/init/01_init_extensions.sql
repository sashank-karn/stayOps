-- Runs automatically on first container start (mounted into docker-entrypoint-initdb.d).
-- Enables pgvector so shared long-term memory can store embeddings (Phase 4+).
CREATE EXTENSION IF NOT EXISTS vector;
