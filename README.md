# StayOps AI: Autonomous PG & Co-Living Multi-Agent System

**Team Name:** Synexis  
**Repository:** [https://github.com/sashank-karn/stayOps](https://github.com/sashank-karn/stayOps)

### Team Members & Contributions
| Member | PRN | GitHub | Primary Ownership |
|---|---|---|---|
| **Sashank Karn** | 23070122277 | [`sashank-karn`](https://github.com/sashank-karn) | Central Orchestrator Agent, Facilitator Supervision, Core Models |
| **Sonali Gupta** | 23070122266 | [`Sona1147`](https://github.com/Sona1147) | Lead & Leasing Agent, Inventory Matching, Frontend Operations UI |
| **Prabin Yadav** | 23070122280 | [`Prabin-yadav`](https://github.com/Prabin-yadav) | Tenant Support Agent, Maintenance & Vendor Agent, Approval Gating |
| **Adarsh Jha** | 23070122261 | [`AdarshCodes1221`](https://github.com/AdarshCodes1221) | Rent & Collections Agent, Vacancy & Revenue Recovery Agent |

---

## 1. Project Overview & Approved Architecture

StayOps AI is a multi-agent AI system specifically architected for PG, hostel, and co-living operations. It eliminates operational fragmentation by employing **seven specialized autonomous agents** collaborating over a shared relational data layer:

1. **Lead & Leasing Agent** (`leasing`): Prospective tenant enquiries, requirement extraction, multi-constraint room matching with transparent scoring, lead profiling, visit scheduling, and outreach proposals.
2. **Tenant Support Agent** (`tenant_support`): Resident communication, intent classification, house rules and facility FAQs, and processing 15-day move-out notices.
3. **Maintenance & Vendor Agent** (`maintenance`): Automated ticket triage, contractor dispatch from verified directory, repair cost estimation, room turnover preparation, and human approval gating for high expenses (> ₹2,000 INR).
4. **Rent & Collections Agent** (`collections`): Verified financial ledger tracking, payment status audits, days overdue calculations, security deposit deduction/refund calculation, and tiered reminders.
5. **Vacancy & Revenue Recovery Agent** (`vacancy_revenue`): Portfolio occupancy metrics, downtime financial risk projections, proactive matching of upcoming room vacancies to active leads.
6. **Central Orchestrator Agent** (`orchestrator`): Central workflow coordinator managing branching, concurrent/parallel execution (e.g. Vacancy & Rent agents on move-out notice), sequential handoffs, and audit logging.
7. **Monitoring & Facilitator Agent** (`facilitator`): Supervisory watchdog inspecting agent outputs, validating schemas, detecting contradictions (e.g. negative balances), and bounding retry policies.

---

## 2. Flagship Demonstration: 15-Day Move-Out Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Resident (Rohan Mehta)
    participant TS as Tenant Support Agent
    participant Orch as Central Orchestrator
    participant Vac as Vacancy & Revenue Agent
    participant Rent as Rent & Collections Agent
    participant Lease as Lead & Leasing Agent
    participant Maint as Maintenance & Vendor Agent
    participant Fac as Facilitator Agent
    actor Manager as Property Manager

    Tenant->>TS: Submits 15-day move-out notice
    TS->>TS: Validates room occupancy & marks status 'notice'
    TS-->>Orch: Emits MoveOutEvent (Room 101, Checkout Date)
    
    par Concurrent Execution (Parallel Step)
        Orch->>Vac: Task A: Analyze vacancy downtime risk & search pipeline leads
        Vac->>Vac: Matches Lead 'Kavya Nair' (Score: 85%) & calculates ₹533/day risk
        Vac-->>Orch: Vacancy Report & Matched Leads
    and
        Orch->>Rent: Task B: Audit tenant payment ledger & deposit settlement
        Rent->>Rent: Verifies zero overdue, calculates ₹32,000 deposit refund
        Rent-->>Orch: Financial Audit & Settlement Report
    end

    Orch->>Lease: Task C: Handoff matched leads for personalized visit proposals
    Lease->>Lease: Drafts tailored visit invitation to Kavya Nair
    Lease-->>Orch: Outreach Proposals Ready

    Orch->>Maint: Task D: Prepare room turnover inspection & deep clean
    Maint->>Maint: Estimates turnover cost (₹2,350 > ₹2,000 threshold)
    Maint-->>Orch: Flags requires_approval = True

    Orch->>Fac: Task E: Supervise workflow integrity & output schemas
    Fac->>Fac: Verifies zero contradictions, validates all 5 agent contracts
    Fac-->>Orch: Report: verified_healthy (5 checks passed)

    Orch->>Manager: Presents unified workflow summary & logs to Approval Queue
```

---

## 3. Technology Stack

- **Backend:** FastAPI, Python 3.12+, Pydantic v2, SQLAlchemy 2.0 (PostgreSQL / SQLite fallback).
- **Multi-Agent Engine:** Autonomous AgentMessage contract architecture with parallel execution dispatch.
- **LLM & Embeddings:** Google Gemini (`gemini-flash-latest`, `gemini-2.5-flash`), `models/gemini-embedding-001`, ChromaDB vector store.
- **External Services:** Google Calendar (RFC 5545 `.ics` export), SMTP / Audit Email service, WhatsApp Business (E.164 normalization & simulator feed).
- **Frontend:** Next.js 14, React 18, TypeScript, Responsive Dark Mode Dashboard with Services Hub.
- **Testing:** Pytest, pytest-asyncio, Starlette TestClient (138 automated unit, agent, workflow, RAG, and integration tests passing).
- **CI/CD:** GitHub Actions automated CI matrix running backend Pytest suite, Next.js build, and explicit TypeScript type checks.

---

## 4. Setup & Running Instructions

### 1. Backend Environment Setup
```bash
# Activate virtual environment
.venv\Scripts\activate

# Install dependencies from pinned requirements
pip install -r requirements.txt

# Seed the database with sample properties, beds, tenants, and users
python -m backend.app.db.seed

# Run FastAPI backend
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API Documentation is available at: `http://localhost:8000/docs`

### 2. Frontend Dashboard Setup
```bash
cd frontend
npm install

# Run explicit TypeScript validation
npm run type-check

# Launch Next.js dev server (Next.js 14.2.35)
npm run dev
```
Open `http://localhost:3000` to interact with the StayOps Property Manager Dashboard.

### 3. Running Automated Tests
```bash
# Run complete test suite (138 tests across all 7 agents, API endpoints, workflows, and integrations)
pytest -v
```

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/metrics` | Unified occupancy %, monthly collected, overdue balance, open tickets |
| `GET` | `/api/properties` | List managed PG properties, address, capacity, and rules |
| `GET` | `/api/rooms` | List rooms with bed-level status and rental rates |
| `GET` | `/api/tenants` | Resident directory with active leases and move-out status |
| `GET` | `/api/leads` | Prospective tenant leads pipeline |
| `POST` | `/api/leads` | Create new prospective lead enquiry |
| `GET` | `/api/tickets` | Maintenance tickets with trade vendor assignments |
| `GET` | `/api/vendors` | Registered contractor directory with ratings and trade hourly rates |
| `GET` | `/api/approvals` | Human-in-the-loop pending approval requests |
| `POST` | `/api/approvals/{id}/review` | Approve or reject sensitive / high-cost agent tasks |
| `GET` | `/api/workflows` | Audit log of all multi-agent workflow executions |
| `GET` | `/api/workflows/{id}` | Detailed task breakdown and timing for a specific workflow run |
| `POST` | `/api/workflows/move-out` | Trigger the 15-day move-out multi-agent workflow |
| `POST` | `/api/workflows/lead-inquiry` | Trigger lead qualification & room matching via Leasing Agent |
| `GET` | `/api/integrations/status` | Live status of Gemini, SMTP, Calendar, WhatsApp, and Vector DB |
| `POST` | `/api/notifications/email` | Dispatch resident email notification via SMTP or persistent dev audit log |
| `GET` | `/api/notifications/history` | Audit trail of dispatched operational emails |
| `POST` | `/api/calendar/schedule` | Schedule operations event / inspection with RFC 5545 `.ics` download |
| `GET` | `/api/calendar/events` | Retrieve scheduled operations events |
| `POST` | `/api/notifications/whatsapp` | Dispatch WhatsApp notice with E.164 phone normalization |
| `GET` | `/api/notifications/whatsapp` | Retrieve resident WhatsApp simulator message feed |
| `POST` | `/rag/query` | RAG semantic search over PG policies, syllabus, and house rules |
| `GET` | `/health` | Service liveness health probe |

---

## 6. Step-by-Step Demonstration Walkthrough

### Demonstrating the 15-Day Move-Out Workflow
1. **Access the Dashboard**: Open `http://localhost:3000` in your browser.
2. **Switch to Move-Out Automation**: Click **"Move-Out Automation"** in the sidebar.
3. **Select Resident**: Select tenant `Rohan Mehta (Room 101, Bed 101-A)`.
4. **Trigger Autonomous Workflow**: Click **"Execute 15-Day Move-Out Workflow"**.
5. **Inspect Coordinated Multi-Agent Execution**:
   - `Tenant Support Agent` validates notice date and active tenancy agreement.
   - `Rent & Collections Agent` and `Vacancy & Revenue Agent` execute concurrently:
     - Rent calculates deposit settlement balance (₹32,000 refund, ₹0 overdue).
     - Vacancy projects downtime exposure and matches prospective lead Kavya Nair.
   - `Lead & Leasing Agent` drafts custom visit outreach.
   - `Maintenance & Vendor Agent` schedules pre-checkout inspection & estimates ₹2,350 turnover cost (automatically creates a Human-in-the-Loop approval entry for costs > ₹2,000).
   - `Supervisory Facilitator` validates schema compliance, checks for zero contradictions, and signs off.
6. **Inspect Autonomous External Integrations**:
   - Under the results card, verify the **Autonomous External Integrations Dispatched** summary:
     - **Calendar**: Pre-checkout room inspection is booked. Click **"Download .ics"** to export the calendar invitation.
     - **Email Service**: Move-out notice & settlement statement dispatched to resident email.
     - **WhatsApp Service**: Move-out reminder and checkout timeline dispatched with normalized E.164 phone number.
7. **Verify Human-in-the-Loop Governance**:
   - Switch to **"Approvals & Verification Queue"** tab.
   - Review the turnover maintenance expense request (₹2,350) and click **"Approve"** to execute the contractor assignment.
8. **Check Comms & Integrations Hub**:
   - Switch to **"Services & Comms"** tab.
   - Verify live service health cards, inspect the email dispatch history, view the operations calendar feed, and view the simulated resident WhatsApp inbox.

---

## 7. n8n Multi-Agent Workflow Automation

StayOps includes a production-ready n8n workflow definition in [`stayops_n8n_workflow.json`](stayops_n8n_workflow.json).

### Quick Setup:
1. Open any n8n instance and press `Ctrl + V` on the canvas to import.
2. The workflow provides:
   - **Inbound Webhook (`/webhook/stayops-agent`)**: Routes natural-language operational tasks directly to the multi-agent engine.
   - **Daily Cron Schedule (09:00 AM)**: Automated portfolio audits and safety gate checks.
   - **Role-Based Routing**: Auto-handles RBAC security alerts (HTTP 403) and operations logs (HTTP 200).
### Cloud Deployment & Database Persistence:
For 24/7 cloud deployment on Render, configure n8n environment variables with your Supabase PostgreSQL pooler (`DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST=aws-0-ap-south-1.pooler.supabase.com`, `DB_POSTGRESDB_PORT=5432`) to prevent SQLite cold-start locks. Set `NODE_OPTIONS=--max-old-space-size=350` and `EXECUTIONS_PROCESS=main` to avoid 512MB RAM OOM reboots. n8n also exposes MCP server support at `/mcp-server/http`.
3. Read the complete guide in [`docs/N8N_INTEGRATION_GUIDE.md`](docs/N8N_INTEGRATION_GUIDE.md).

---

## 8. Executive Property Manager AI Persona & Natural Language Directives

StayOps orchestrator integrates with Google Gemini to understand dynamic natural language commands from property managers and system administrators:
- **Administrative Persona**: The AI treats the caller with full administrative authority across all properties (`StayOps TechPG` in Koramangala Bengaluru, `StayOps CampusLiving` in Viman Nagar Pune), rooms, beds, tenants, and safety gates.
- **Autonomous Operations**: Understands flexible requests such as allocating beds, handling spelling variations (`vimangar`), auditing financial ledgers, and surfacing high-expense safety gate approvals (> ₹2,000 INR).
- **Graceful Fallbacks**: In case of rate limits or cloud connection latency, deterministic intent dispatchers ensure 100% operational continuity.


