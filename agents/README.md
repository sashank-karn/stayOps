# Agents — Person 2 (core AI architecture)

Seven specialized agents collaborate via structured `AgentMessage`s
(`shared/schemas/agent_message.py`) and a shared memory layer. Built on **LangGraph**.

| Package | Agent | Built in |
|---------|-------|----------|
| `leasing/` | Lead & Leasing | Phase 5 |
| `tenant_support/` | Tenant Support | Phase 6 |
| `maintenance/` | Maintenance & Vendor | Phase 7 |
| `collections/` | Rent & Collections | Phase 8 |
| `vacancy_revenue/` | Vacancy & Revenue Recovery *(flagship)* | Phase 9 |
| `orchestrator/` | Orchestrator (coordination) | Phase 10 |
| `facilitator/` | Facilitator / Monitoring | Phase 11 |

## Design rules

- Agents communicate with **structured messages**, not direct function calls.
- The **orchestrator** decides which agent(s) run and passes context between them — it is a
  real coordinator, not a hard-coded `if/else` router.
- The **facilitator** watches execution, detects failures/conflicts, requests retries, and
  escalates to a human.
- Expensive or sensitive actions (large maintenance spend, vendor payments, record changes)
  set `requires_approval=True` and wait for human approval.
- Every message/task is persisted so the dashboard's Agent Activity timeline can replay
  "which agent did what, who it contacted, and the result."

## Dependency

Agent work depends on the **database schema (Phase 2)** for persistence and shared memory.
Person 2 can start on the LangGraph scaffolding and agent state in parallel, but wiring to
real tables waits on Person 1's schema.
