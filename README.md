# StayOps AI

**A Multi-Agent AI System for Autonomous PG and Co-Living Operations**

StayOps AI is a multi-agent system for PG, hostel, and co-living businesses. Specialized AI
agents collaborate to manage leasing, tenant support, maintenance, rent collection, and
vacancy recovery. A central **Orchestrator Agent** coordinates these agents while a
**Facilitator Agent** monitors their execution. The system combines shared memory, business
data, tool usage, and agent-to-agent communication to automate multi-step property operations
and proactively reduce revenue loss caused by vacancies and operational inefficiencies.

> This is **not** a property-management dashboard with an AI chatbot bolted on. The core of the
> system is a collaborating team of specialized agents.

---

## RAG Pipeline (Phase 1)

The RAG (Retrieval-Augmented Generation) pipeline enables the system to ingest course
materials and answer questions grounded in that content:

| Component | Description |
|-----------|-------------|
| **Document Ingestion** | PDF, PPTX, DOCX parsing with page/slide metadata |
| **Text Chunking** | Configurable chunk sizes and overlap |
| **Embeddings** | OpenAI or Gemini embedding generation |
| **Vector Store** | Persistent ChromaDB storage with deduplication |
| **Semantic Retrieval** | Top-k similarity search with score threshold |
| **Answer Generation** | LLM-grounded answers with source citations |
| **Safety** | Prompt-injection detection and fallback handling |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rag/query` | Ask a question about ingested course materials |
| `POST` | `/rag/ingest/upload` | Upload and ingest PDF/PPTX/DOCX files |
| `POST` | `/rag/ingest/syllabus` | Ingest the syllabus/ directory contents |
| `GET` | `/rag/status` | Pipeline and vector store statistics |

---

## The Agents

| # | Agent | Responsibility |
|---|-------|----------------|
| 1 | **Lead & Leasing** | Enquiries, room search & recommendation, lead qualification, visit scheduling, booking |
| 2 | **Tenant Support** | Tenant communication, FAQs, complaint triage, ticket creation, routing to other agents |
| 3 | **Maintenance & Vendor** | Issue categorization, priority, vendor selection, job tracking, cost, approvals |
| 4 | **Rent & Collections** | Due dates, payment status, reminders, follow-ups, escalation, collection summaries |
| 5 | **Vacancy & Revenue Recovery** | *(flagship)* Detect vacancies, predict upcoming ones, match leads, estimate revenue loss, recommend & trigger action |
| 6 | **Orchestrator** | Receives requests, selects agents, passes context, coordinates multi-step workflows, escalates to humans |
| 7 | **Facilitator / Monitoring** | Tracks execution, detects failures/conflicts, requests retries, maintains logs, escalates |

See [`docs/architecture.md`](docs/architecture.md) for the full design.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js / React (TypeScript) |
| Backend | FastAPI (Python) |
| Agent framework | LangGraph |
| LLM | **Configurable** via `.env` (OpenAI / Gemini / others) |
| Database | PostgreSQL |
| Vector search | ChromaDB + pgvector |
| Messaging | WhatsApp Business API |
| Auth | JWT |
| Deployment | Docker + Docker Compose |

The architecture is modular so individual components can be replaced later.

---

## Repository Layout

```
stayops-ai/
├── frontend/        # Next.js owner dashboard
├── backend/         # FastAPI app, APIs, auth
│   └── app/
│       └── rag/     # RAG pipeline (Phase 1)
│           ├── ingestion.py     # PDF/PPTX/DOCX parsers
│           ├── chunking.py      # Text splitting
│           ├── embeddings.py    # Embedding generation
│           ├── vectorstore.py   # ChromaDB persistence
│           ├── retrieval.py     # Semantic search + answer generation
│           ├── pipeline.py      # Pipeline orchestrator
│           └── router.py        # FastAPI endpoints
├── agents/          # LangGraph multi-agent system
│   ├── leasing/
│   ├── tenant_support/
│   ├── maintenance/
│   ├── collections/
│   ├── vacancy_revenue/
│   ├── orchestrator/
│   └── facilitator/
├── database/        # Schema, migrations, seed data
├── shared/          # Config, LLM client, schemas shared across services
├── syllabus/        # Course materials for RAG ingestion
├── tests/           # Unit & integration tests
├── docs/            # Architecture & documentation
├── docker/          # Dockerfiles
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## Quick Start

> Full prerequisite install instructions (Windows) are in [`docs/setup.md`](docs/setup.md).

```bash
# 1. Clone
git clone https://github.com/sashank-karn/stayOps.git && cd stayOps

# 2. Environment
cp .env.example .env        # then fill in API keys

# 3. Backend (run from the repo root so the `shared` package resolves)
python -m venv .venv
# Windows:  .venv\Scripts\activate   |  macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload   # http://localhost:8000/health

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev                          # http://localhost:3000
```

Or, once Docker is installed:

```bash
docker compose up --build
```

### Using the RAG Pipeline

```bash
# Ingest syllabus materials
curl -X POST http://localhost:8000/rag/ingest/syllabus

# Ask a question
curl -X POST http://localhost:8000/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What topics are covered in the Agentic AI course?"}'

# Check pipeline status
curl http://localhost:8000/rag/status
```

### Running Tests

```bash
# From the repo root with venv activated
pytest                    # All tests
pytest tests/test_ingestion.py   # Ingestion tests only
pytest tests/test_chunking.py    # Chunking tests only
pytest tests/test_retrieval.py   # Retrieval tests only
pytest tests/test_rag_api.py     # API integration tests
pytest tests/test_smoke.py       # Original Phase 1 smoke tests
```

---

## Team & Branches

| Member | GitHub | Area | Branch |
|--------|--------|------|--------|
| Sashank Karn | [`sashank-karn`](https://github.com/sashank-karn) | Document ingestion & parsing | `feature/ingestion` |
| Sonali | [`Sona1147`](https://github.com/Sona1147) | Chunking, embeddings & vector store | `feature/embeddings-vectorstore` |
| Adarsh | [`AdarshCodes1221`](https://github.com/AdarshCodes1221) | Retrieval, generation & citations | `feature/retrieval-generation` |
| Prabin | [`Prabin-yadav`](https://github.com/Prabin-yadav) | API integration, interface & QA | `feature/api-integration` |

Contribution rules and the Git workflow are in [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Project Status

**Phase 1 — Repository + project structure + RAG pipeline.** ✅ Implementation complete.

See [`docs/roadmap.md`](docs/roadmap.md) for all 17 phases.

### Known Limitations

- Course materials must be provided as PDF, PPTX, or DOCX files
- Scanned/image-only pages are detected but cannot extract text (OCR not implemented)
- The LLM API key (OpenAI or Gemini) must be configured for query answering
- ChromaDB is used for local vector storage; production should consider pgvector
