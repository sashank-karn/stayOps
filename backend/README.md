# Backend (FastAPI) — Person 1

The API layer, database models, authentication, and the HTTP endpoints that expose
agent tasks/logs to the dashboard.

## Layout (grows over the phases)

```
backend/
├── app/
│   ├── main.py          # FastAPI entrypoint (/, /health, /readiness)
│   ├── core/            # config, security, db session
│   ├── models/          # SQLAlchemy models            (Phase 2)
│   ├── schemas/         # Pydantic request/response     (Phase 2)
│   ├── routers/         # API routes                    (Phase 2–3)
│   └── crud/            # DB operations                 (Phase 2)
└── requirements.txt
```

## Run (from the repository root)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate   |  macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

Open http://localhost:8000/docs for the interactive API docs.
