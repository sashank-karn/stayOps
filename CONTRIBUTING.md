# Contributing to StayOps AI

## Team & Ownership

| Member | GitHub | Workstream | Branch | Deliverables |
|--------|--------|------------|--------|-------------|
| **Sashank Karn** | [`sashank-karn`](https://github.com/sashank-karn) | Document ingestion & parsing | `feature/ingestion` | PDF/PPTX/DOCX extractors, metadata preservation, image-only detection, error reporting, ingestion tests |
| **Sonali** | [`Sona1147`](https://github.com/Sona1147) | Chunking, embeddings & vector store | `feature/embeddings-vectorstore` | Configurable chunking, embedding generation, ChromaDB persistence, deduplication, chunking tests |
| **Adarsh** | [`AdarshCodes1221`](https://github.com/AdarshCodes1221) | Retrieval, generation & citations | `feature/retrieval-generation` | Semantic search, context construction, LLM answer generation, source citations, fallback handling, prompt-injection resistance, retrieval tests |
| **Prabin** | [`Prabin-yadav`](https://github.com/Prabin-yadav) | API integration, interface & QA | `feature/api-integration` | FastAPI router, pipeline orchestrator, endpoint validation, end-to-end tests, documentation, setup instructions |

## Phase 1 Workstream Details

### Member 1: Sashank Karn — Document Ingestion & Parsing

**Files**: `backend/app/rag/ingestion.py`, `tests/test_ingestion.py`

- [ ] PDF text extraction with page metadata
- [ ] PPTX slide extraction with title and content
- [ ] DOCX paragraph and table extraction
- [ ] Image-only page detection and reporting
- [ ] File and directory-level ingestion with error reporting
- [ ] Unit tests for all document types and edge cases

### Member 2: Sonali — Chunking, Embeddings & Vector Store

**Files**: `backend/app/rag/chunking.py`, `backend/app/rag/embeddings.py`, `backend/app/rag/vectorstore.py`, `tests/test_chunking.py`

- [ ] RecursiveCharacterTextSplitter with configurable parameters
- [ ] Metadata preservation through chunking
- [ ] OpenAI and Gemini embedding support
- [ ] ChromaDB persistent storage
- [ ] Content-hash deduplication
- [ ] Batch insertion and statistics
- [ ] Unit tests for chunking and metadata

### Member 3: Adarsh — Retrieval, Generation & Citations

**Files**: `backend/app/rag/retrieval.py`, `tests/test_retrieval.py`

- [ ] Semantic similarity search with configurable top-k
- [ ] Context construction with source labels
- [ ] LLM-based answer generation grounded in context
- [ ] Source citations with document and page/slide references
- [ ] Fallback response when context is insufficient
- [ ] Prompt-injection detection and reporting
- [ ] Tests for injection detection, context building, citations

### Member 4: Prabin — API Integration, Interface & QA

**Files**: `backend/app/rag/router.py`, `backend/app/rag/pipeline.py`, `tests/test_rag_api.py`

- [ ] FastAPI router with query, upload, and status endpoints
- [ ] Pipeline orchestrator tying all modules together
- [ ] Request validation and error handling
- [ ] Backward compatibility with existing endpoints
- [ ] End-to-end API tests
- [ ] README and setup documentation

## Testing Responsibilities

Each member is responsible for testing their own workstream:

| Test File | Owner | Scope |
|-----------|-------|-------|
| `tests/test_ingestion.py` | Sashank | PDF/PPTX/DOCX parsing, errors, metadata |
| `tests/test_chunking.py` | Sonali | Text splitting, overlap, metadata preservation |
| `tests/test_retrieval.py` | Adarsh | Injection detection, context, citations, fallback |
| `tests/test_rag_api.py` | Prabin | API endpoints, validation, backward compatibility |
| `tests/test_smoke.py` | All | Existing Phase 1 smoke tests (must still pass) |

## Review Requirements

1. Each PR must be reviewed by **at least one other team member** before merge
2. All tests in the PR's scope must pass
3. The existing smoke tests (`test_smoke.py`) must continue to pass

## Branching Model

- `main` is the **stable** branch. Never push unfinished work directly to it.
- Each member works only on their own feature branch.
- Branch off the latest `main`:

  ```bash
  git checkout main && git pull
  git checkout -b feature/<your-area>
  ```

## Commit Rules

1. Make **regular, meaningful** commits — not one giant commit at the end.
2. Use [Conventional Commits](https://www.conventionalcommits.org/):

   | Prefix | Use for |
   |--------|---------|
   | `feat:` | a new feature |
   | `fix:` | a bug fix |
   | `docs:` | documentation only |
   | `test:` | adding/altering tests |
   | `chore:` | tooling, config, scaffolding |
   | `refactor:` | code change that neither fixes a bug nor adds a feature |

   **Good:** `feat: add PDF ingestion with page metadata` · `test: add prompt injection tests`
   **Avoid:** `final`, `final2`, `finalfinal`, `pleasework`

## Pull Requests

1. Push your branch, then open a PR into `main`.
2. **At least one other member must review** before merge.
3. Resolve all conflicts before merging.
4. Keep PRs focused — one feature/milestone per PR where possible.

## Secrets

Never commit `.env` or API keys. Only `.env.example` (with blank/placeholder values) is
tracked. If you accidentally commit a secret, rotate it immediately and tell the team.
