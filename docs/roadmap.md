# StayOps AI — Roadmap & team dependencies

17 phases, built incrementally (plan → implement → test → verify → commit → push → next).
Each phase names the primary owner and what it's blocked by.

| Phase | Deliverable | Primary owner | Depends on |
|-------|-------------|---------------|------------|
| 1 | Repo + structure + environment setup | Person 1 (foundation) | — |
| 2 | Database schema + backend foundation | Person 1 | 1 |
| 3 | Authentication + dashboard foundation | Person 1 + 3 | 2 |
| 4 | Agent framework + shared state + comms | Person 2 | 2 |
| 5 | Lead & Leasing Agent | Person 2 | 4 |
| 6 | Tenant Support Agent | Person 2 | 4 |
| 7 | Maintenance & Vendor Agent | Person 2 | 4 |
| 8 | Rent & Collections Agent | Person 2 | 4 |
| 9 | Vacancy & Revenue Recovery Agent *(flagship)* | Person 2 | 5, 8 |
| 10 | Orchestrator Agent | Person 2 | 5–9 |
| 11 | Facilitator Agent | Person 2 | 10 |
| 12 | WhatsApp integration | Person 4 | 5, 6 |
| 13 | Agent activity monitoring (dashboard) | Person 3 + 4 | 10, 11 |
| 14 | End-to-end workflows | all | 10–13 |
| 15 | Testing | Person 4 | 14 |
| 16 | Docker + deployment | Person 4 | 14 |
| 17 | Final demo + documentation | all | 15, 16 |

## Key cross-person dependencies

- **Agents (Person 2) need the schema (Person 2 ← Person 1, Phase 2).** Person 2 can start the
  LangGraph scaffolding and agent state in parallel, but persistence waits on the schema.
- **Dashboard Agent Activity view (Person 3) needs the agent-logs API (Person 1) and real
  agent runs (Person 2).**
- **WhatsApp (Person 4) needs the Leasing & Tenant Support agents (Person 2).**

## Working style per phase

For each phase the mentor provides: what we're building and why, the exact files, complete
code, how to run it, test cases, verification, and then the milestone + push instruction
(who commits, which branch, exact message, push YES/NO).
