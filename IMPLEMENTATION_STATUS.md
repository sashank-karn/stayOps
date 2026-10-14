# StayOps AI — Complete Implementation Status & System Runbook

**Project**: Team Synexis — *StayOps AI: Autonomous PG & Co-Living Multi-Agent Operations System*  
**Repository**: [https://github.com/sashank-karn/stayOps](https://github.com/sashank-karn/stayOps)  
**Status**: **Production Ready / Fully Operational**  
**Test Suite**: **132 Passed, 0 Failed across 14 Test Suites (100% Pass Rate)**  
**Frontend**: Next.js 14 (TypeScript) — 0 Type Errors, Production Build Succeeded  
**Backend**: FastAPI + SQLAlchemy + SQLite (`stayops.db`) + Pytest  

---

## 1. Executive Summary

StayOps AI is an autonomous, multi-agent operations platform purpose-built for student housing, Paying Guest (PG) facilities, and co-living portfolios. It replaces fragmented, manual spreadsheets and disjointed communication channels with a coordinated swarm of 7 specialized AI agents orchestrated by a central supervisory bus.

Every core operational domain—from tenant check-ins, bed allocation guards, dynamic lease tracking, rent collection with simulated payment ledgers, maintenance SLA escalations, to vacancy re-listing—has been fully implemented, integrated, and verified end-to-end.

---

## 2. Multi-Agent Swarm Architecture

The StayOps AI multi-agent architecture utilizes a decoupled event bus (`agents/bus/`) with deterministic fallback execution, schema validation, and supervisory compliance auditing.

```
                      ┌────────────────────────────────────────┐
                      │          Supervisory Facilitator       │
                      │    (Policy Guardrails & Compliance)    │
                      └──────────────────┬─────────────────────┘
                                         │
                      ┌──────────────────▼─────────────────────┐
                      │          Central Orchestrator          │
                      │     (Task Decomposition & Dispatch)    │
                      └──────────────────┬─────────────────────┘
                                         │ Event Bus
         ┌──────────────┬────────────────┼────────────────┬──────────────┐
         ▼              ▼                ▼                ▼              ▼
┌────────────────┐┌─────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│  Lead & Lease  ││   Tenant    ││ Maintenance  ││    Rent &    ││  Vacancy &   │
│   Onboarding   ││   Support   ││   & Vendor   ││ Collections  ││   Revenue    │
└────────────────┘└─────────────┘└──────────────┘└──────────────┘└──────────────┘
```

### The 7 Specialized Agents

| # | Agent Name | Domain / Role | Primary Capabilities | Status |
|---|---|---|---|---|
| **1** | **Central Orchestrator** | Coordination & Workflow Engine | Multi-step task decomposition, routing, execution tracking, and interactive task dispatching. | **Active** |
| **2** | **Supervisory Facilitator** | Compliance & Quality Assurance | Verifies agent decisions against PG house rules, legal standards, and SLA boundaries. | **Active** |
| **3** | **Lead & Leasing Agent** | Tenant Pipeline & Onboarding | Room matching, budget filtering, digital lease generation, and check-in workflows. | **Active** |
| **4** | **Tenant Support Agent** | Resident Services & Resolution | Intent classification, FAQ resolution, issue logging, and escalation handling. | **Active** |
| **5** | **Maintenance & Vendor Agent**| Maintenance & Triage | Category classification, SLA monitoring (Emergency/Urgent/Standard), and vendor assignment. | **Active** |
| **6** | **Rent & Collections Agent** | Ledger & Financial Recovery | Dues tracking, automated reminders, payment logging, and delinquent risk scoring. | **Active** |
| **7** | **Vacancy & Revenue Agent** | Yield & Occupancy Optimization | Bed turn-around tracking, dynamic pricing rules, and vacancy mitigation strategies. | **Active** |

---

## 3. Flagship Workflow: 15-Day Move-Out Orchestration

The flagship demonstration scenario showcases autonomous multi-agent collaboration when a resident submits a 15-day move-out notice:

1. **Step 1: Notice Ingestion & Validation**  
   *Agent*: `Tenant Support Agent`  
   Validates tenant lease agreement, calculates remaining tenure, and verifies 30-day notice policy compliance.
2. **Step 2: Dues & Ledger Verification**  
   *Agent*: `Rent & Collections Agent`  
   Audits rent history, utility shares, and pending penalties to compute net payable / refundable deposit balance.
3. **Step 3: Move-Out Inspection & Turnover Scheduling**  
   *Agent*: `Maintenance & Vendor Agent`  
   Schedules deep cleaning, inventory inspection, and assigns vetted vendor tasks before the check-out date.
4. **Step 4: Bed Remarketing & Dynamic Re-listing**  
   *Agent*: `Vacancy & Revenue Agent`  
   Re-lists the bed in the pipeline for the day following move-out with dynamic price adjustments based on seasonal occupancy.
5. **Step 5: Facilitator Supervisory Sign-Off**  
   *Agent*: `Supervisory Facilitator`  
   Validates compliance with local tenancy laws, deposit refund timelines, and issues audit seal.

---

## 4. Backend Architecture & API Specifications

The backend is built on **FastAPI** with SQLite (`stayops.db`), SQLAlchemy ORM, and comprehensive Pydantic domain models.

### Authentication & Authorization
- **Security**: JWT (Bearer tokens) with PBKDF2/Bcrypt password hashing.
- **Roles**: `Admin`, `Property Manager`, `Resident`.
- **Default Seed Accounts**:
  - `admin@stayops.ai` / `Admin@123` (Role: `admin`)
  - `manager@stayops.ai` / `Manager@123` (Role: `manager`)
  - `resident@stayops.ai` / `Resident@123` (Role: `resident`)

### Core API Endpoints

#### Authentication
- `POST /api/auth/register` — Register new user account.
- `POST /api/auth/login` — Authenticate and obtain JWT access token.
- `GET /api/auth/me` — Retrieve authenticated user profile and role permissions.

#### Properties, Rooms & Beds
- `GET /api/properties` — List all properties with real-time occupancy stats.
- `POST /api/properties` — Register a new property portfolio asset.
- `GET /api/properties/{id}` — Get detailed property view with nested rooms & beds.
- `POST /api/properties/{id}/rooms` — Add room to property.
- `POST /api/rooms/{id}/beds` — Add bed with status (`available`, `occupied`, `maintenance`).

#### Residents & Leases
- `GET /api/tenants` — List active residents and lease metadata.
- `POST /api/tenants` — Register a new resident profile.
- `GET /api/leases` — List active and historical leases.
- `POST /api/leases` — Create lease with **occupancy guard**:
  - Rejects allocation if the target bed is already occupied (`400 Bad Request`).
  - Automatically transitions bed status to `occupied`.

#### Rent Ledger & Payments
- `GET /api/rent-records` — List all ledger entries, overdue balances, and payments.
- `POST /api/rent-records/{id}/pay` — Record or simulate full/partial rent payment with transaction reference.

#### Maintenance & Work Orders
- `GET /api/tickets` — List maintenance tickets filtered by status or priority.
- `POST /api/tickets` — Submit maintenance ticket with category and SLA priority.
- `PATCH /api/tickets/{id}/status` — Advance ticket status (`open` -> `in_progress` -> `resolved` -> `closed`).
- `PATCH /api/tickets/{id}/assign` — Assign ticket to internal staff or external vendor.

#### Multi-Agent Studio & Telemetry
- `GET /api/agents` — Retrieve directory of all 7 registered agents with status and capabilities.
- `POST /api/agents/dispatch` — Dispatch natural-language commands to the multi-agent bus with trace auditing.
- `GET /api/notifications` — Real-time operational alert feed (overdue rent, SLA breaches, workflow milestones).

---

## 5. Frontend Architecture & Interactive Dashboard

The frontend is built with **Next.js 14 App Router**, **TypeScript**, and modern CSS design tokens featuring a sleek dark-mode glassmorphic theme.

### Interactive Dashboard Tabs
1. **Multi-Agent Studio**: Interactive prompt dispatch console with real-time step execution trace logs, agent attribution cards, and supervisory verification seals.
2. **Flagship 15-Day Move-Out**: Step-by-step interactive runner for autonomous tenant exit workflows.
3. **Properties & Units**: Real-time occupancy cards, room and bed hierarchies, with an "Add Property" modal.
4. **Residents & Leases**: Tenant directory, lease duration tracking, and an "Allocate Lease" modal with bed-guard feedback.
5. **Rent Ledger & Financials**: Live ledger displaying dues, late fees, and an instant "Record Payment" simulation modal.
6. **Maintenance & Vendors**: Work-order board with SLA urgency badges and a "Submit Ticket" triage modal.
7. **Leads Pipeline**: Prospect inquiries, budget matching, and lead conversion tracker.
8. **Approvals Queue**: Human-in-the-loop validation console for high-impact agent actions.
9. **Notifications & Alerts**: Real-time notification feed categorizing urgent system alerts.
10. **Agent Bus Diagnostics**: Live agent registry, event bus telemetry, and model fallback health indicators.

---

## 6. Verification & Test Suite Results

The comprehensive test suite encompasses unit tests, integration tests, and multi-agent workflow simulations across 14 test suites.

```
============================= test session starts =============================
platform win32 -- Python 3.12.5, pytest-8.3.4
collected 132 items

tests/test_api_endpoints.py ............                                 [  9%]
tests/test_audit_logger.py ...                                           [ 11%]
tests/test_collections_agent.py ...........                              [ 19%]
tests/test_event_bus.py .......                                          [ 25%]
tests/test_facilitator_agent.py ......                                   [ 29%]
tests/test_leads_agent.py ........                                       [ 35%]
tests/test_move_out_orchestration.py ........                            [ 41%]
tests/test_phase2_endpoints.py ............                              [ 50%]
tests/test_property_analytics.py .........                               [ 57%]
tests/test_reconciliation.py ............                                [ 66%]
tests/test_sla_breach_detection.py ........                              [ 72%]
tests/test_support_maintenance_agents.py ..................              [ 86%]
tests/test_tenant_experience.py .........                                [ 93%]
tests/test_vacancy_recovery.py .........                                 [100%]

======================= 132 passed, 12 warnings in 85.12s ======================
```

### TypeScript & Production Build Verification
- **Type Check**: `npm run type-check` — **0 Errors**
- **Production Build**: `npm run build` — **Compiled Successfully (`4/4` pages static optimized)**

---

## 7. Quickstart & Operational Runbook

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### Step 1: Environment Setup & Database Seeding
```bash
# Activate virtual environment
.\.venv\Scripts\activate

# Install backend dependencies (if needed)
pip install -r requirements.txt

# Seed the database with sample properties, beds, tenants, and users
python -m backend.app.db.seed
```

### Step 2: Start the Backend API Server
```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Step 3: Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
- Dashboard URL: [http://localhost:3000](http://localhost:3000)

### Step 4: Running the Full Automated Test Suite
```bash
pytest -v
```
