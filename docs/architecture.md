# StayOps AI — Architecture

## 1. What this is

StayOps AI is a **multi-agent AI system** for PG, hostel, and co-living operations. The core
is a team of specialized agents that collaborate — not a dashboard with a single chatbot.

The flagship capability is **Autonomous Vacancy & Revenue Recovery**: instead of reporting
"17 rooms are vacant," the system reasons "Room 204 will likely be vacant in 15 days, these
5 existing leads match it, start the booking workflow" — a chain that spans several agents.

## 2. Agents

```
                           ┌─────────────────────┐
        user / system ───► │   Orchestrator      │ ◄── decides who runs,
                           │   (coordination)    │     passes context,
                           └──────────┬──────────┘     combines results
                                      │
        ┌───────────────┬─────────────┼──────────────┬────────────────┐
        ▼               ▼             ▼              ▼                ▼
   ┌─────────┐    ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────────┐
   │ Leasing │    │  Tenant    │ │Maintenance│ │Collections │ │ Vacancy & Revenue│
   │         │    │  Support   │ │ & Vendor  │ │            │ │   (flagship)     │
   └─────────┘    └────────────┘ └───────────┘ └────────────┘ └──────────────────┘
        ▲                                                             │
        └───────────────── triggered to contact matched leads ───────┘

                           ┌─────────────────────┐
   every execution ──────► │   Facilitator       │  detects failures/conflicts,
   is monitored by         │   (monitoring)      │  retries, escalates to human
                           └─────────────────────┘
```

| Agent | Core job |
|-------|----------|
| **Lead & Leasing** | Enquiry → room search → recommendation → lead → visit → booking |
| **Tenant Support** | Tenant comms, FAQs, complaint triage, tickets, routing |
| **Maintenance & Vendor** | Categorize, prioritize, pick vendor, track job/cost, request approval |
| **Rent & Collections** | Due dates, reminders, follow-ups, escalation, summaries |
| **Vacancy & Revenue Recovery** | Detect/predict vacancy, match leads, estimate loss, trigger leasing |
| **Orchestrator** | Route, pass context, maintain task state, combine outputs, escalate |
| **Facilitator** | Monitor execution, detect failure/conflict, retry, log, escalate |

## 3. Agent communication

Agents never call each other as bare functions. Each hand-off is a structured
`AgentMessage` (`shared/schemas/agent_message.py`):

```
task_id · sender_agent · receiver_agent · task_type · input_data ·
context · priority · status · result · error · requires_approval · timestamps
```

Every message/task is persisted (`AgentTasks`, `AgentMessages`, `AgentLogs`) so the
dashboard's **Agent Activity** timeline can replay exactly which agent did what, who it
contacted, and the outcome. That timeline is the primary evidence the system is genuinely
multi-agent.

## 4. Shared memory

- **Short-term:** the current conversation/workflow state carried in the agent graph state
  and the `context` field of messages.
- **Long-term:** tenant conversations, property info, FAQs, past maintenance, vendor history,
  prior enquiries, booking history — stored in PostgreSQL, with a `vector` column
  (**pgvector**) for semantic retrieval.

## 5. Human-in-the-loop

Expensive or sensitive actions (large maintenance spend above `APPROVAL_COST_THRESHOLD`,
vendor payments, account/record changes) set `requires_approval=True` and wait for owner
approval. The dashboard labels actions as **auto-executed** vs **human-approved**.

## 6. Configurable LLM

Nothing hard-codes a provider. `shared/llm/provider.py#get_llm()` reads `LLM_PROVIDER`
from `.env` and returns the matching LangChain chat model (OpenAI or Gemini today, more
later). Swapping providers is a config change.

## 7. Flagship demo scenario

"A tenant is moving out" → Tenant Support → Orchestrator → Vacancy & Revenue (find matching
leads) → Leasing (follow up, schedule visit, book) → Collections (check existing payment) →
Maintenance (prepare room). The dashboard then shows the upcoming vacancy, matched leads,
follow-ups, visit, room/payment/maintenance status, revenue impact, and the agent timeline.
