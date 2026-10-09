# Tests — Person 4

Unit, agent-workflow, and end-to-end tests.

## Run (from the repo root)

```bash
pip install -r backend/requirements.txt
pytest
```

## Phase 1

`test_smoke.py` verifies the backend boots (`/health`, `/`, `/readiness`), settings build a
valid database URL, the readiness probe never leaks the LLM key, and the `AgentMessage`
envelope behaves correctly. Agent-workflow and e2e tests grow from Phase 5 onward.
