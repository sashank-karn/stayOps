# Shared package

Code imported by both the backend and the agents, so there is one source of truth.

| Module | Purpose |
|--------|---------|
| `config.py` | Environment-driven settings (`get_settings()`). Includes the **configurable** LLM provider selection. |
| `llm/provider.py` | `get_llm()` — returns a LangChain chat model for whichever provider `.env` selects. Agents never import a vendor SDK directly. |
| `schemas/agent_message.py` | The structured message envelope agents use to talk to each other (`task_id`, `sender_agent`, `receiver_agent`, …). |

Switching LLM provider is a `.env` change (`LLM_PROVIDER=openai` → `gemini`), never a code change.
