# StayOps AI — Technical Architecture Specification

## 1. Multi-Agent System Overview
StayOps AI organizes property operations around a team of seven specialized agents coordinated through structured `AgentMessage` envelopes and an authoritative relational operational data store.

### Communication Pattern
- **Loose Coupling:** Agents communicate strictly via schema-validated contracts (`AgentMessage`).
- **Parallel Execution:** Independent operational checks run concurrently (e.g. Vacancy Risk + Rent Ledger Audit).
- **Auditability:** Every task invocation is recorded in `AgentTaskRecord` with duration, inputs, outputs, and errors.
- **Human-in-the-Loop:** Actions exceeding ₹2,000 INR require explicit property manager approval through `ApprovalRequest`.

---

## 2. Agent Responsibilities & Contracts

```
+--------------------------------------------------------------------------+
|                             API / UI Request                             |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                         Central Orchestrator Agent                       |
|          - Workflow state management & task scheduling                   |
|          - Parallel & sequential dependency dispatch                     |
|          - Approval gate evaluation & response consolidation             |
+--------------------------------------------------------------------------+
       |                  |                  |                  |
       v                  v                  v                  v
+--------------+   +--------------+   +--------------+   +-----------------+
| Tenant       |   | Vacancy &    |   | Rent &       |   | Maintenance &   |
| Support      |   | Revenue      |   | Collections  |   | Vendor          |
| Agent        |   | Agent        |   | Agent        |   | Agent           |
+--------------+   +--------------+   +--------------+   +-----------------+
                          |
                          v
                   +--------------+
                   | Lead &       |
                   | Leasing      |
                   | Agent        |
                   +--------------+
                          |
                          v
+--------------------------------------------------------------------------+
|                     Monitoring & Facilitator Agent                       |
|           - Output schema validation & contradiction detection           |
|           - Execution health verification & audit reporting              |
+--------------------------------------------------------------------------+
```

---

## 3. Flagship Scenario: 15-Day Move-Out Flow Execution

1. **Trigger:** Resident submits checkout notice specifying move-out date.
2. **Step 1 — Tenant Support Agent:** Validates resident identity, room number, and updates status to `notice`.
3. **Step 2 — Concurrent Branch:**
   - **Branch A (Vacancy & Revenue):** Projects downtime loss (`₹533/day`) and queries `Lead` table for prospective tenants matching the room type and location.
   - **Branch B (Rent & Collections):** Audits monthly payment ledger, verifies outstanding balance, and computes deposit refund after deductions.
4. **Step 3 — Lead & Leasing Agent:** Receives qualified matching leads from Branch A and formats personalized property visit proposals.
5. **Step 4 — Maintenance & Vendor Agent:** Schedules room turnover deep clean with registered contractor. Flags `requires_approval = True` if cost > ₹2,000 threshold.
6. **Step 5 — Facilitator Agent:** Validates that all schemas contain required keys, verifies absence of contradictions, and outputs execution audit health report.
7. **Step 6 — Orchestrator Consolidation:** Synthesizes final response for property manager dashboard and logs workflow event.

---

## 4. Interactive Natural-Language Operational Action Engine

The Central Multi-Agent Orchestrator features an operational command interceptor (`_execute_operational_action`) enabling natural language prompt execution across all core domain workflows:
- **Property Tour Pipeline:** Scheduling, confirming, completing, and canceling tours with regex word-boundary visitor matching.
- **Access & Auth Management:** Real-time user activation, deactivation, role modification, and account removal.
- **Leasing & Allocation:** Automatic tenant creation, bed allocation (`occupied`), and 6-month active lease generation.
- **Ledger & Collections:** Rent payment recording, ledger reconciliation (`paid`), UPI reference logging, and WhatsApp dunning reminders.
- **Maintenance & Work Orders:** Automated severity/cost triage, vendor dispatch, and ticket resolution.
- **Safety Gate Verification:** Direct authorization and human-in-the-loop approval management.
- **Live Pipeline Visibility:** Instant tabular listings for properties, users, tickets, vendors, tours, tenants, approvals, and vacant beds.
