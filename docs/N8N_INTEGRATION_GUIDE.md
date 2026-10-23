# StayOps n8n Workflow Automation Guide

This guide describes how to import and use the StayOps AI Multi-Agent n8n workflow (`stayops_n8n_workflow.json`).

---

## 1. Quick Import to n8n (Copy & Paste)

1. Open your **n8n instance** (cloud or self-hosted at `http://localhost:5678`).
2. Create a **New Workflow**.
3. In the workflow canvas, press **`Ctrl + V`** (or `Cmd + V` on macOS) or click **Workflow menu (three dots) -> Import from File** and select `stayops_n8n_workflow.json`.
4. All 10 configured nodes and routing connections will immediately appear on your canvas.

---

## 2. Workflow Architecture

```
[Webhook Trigger: POST /webhook/stayops-agent] ──┐
                                                 ├──> [Parse & Normalize Input] ──> [Call StayOps Engine]
[Daily Cron: 09:00 AM Heartbeat] ───────────────┘                                         │
                                                                                         ▼
                                                                           [Route by Action Performed]
                                                                                         │
                    ┌──────────────────────────────────┬─────────────────────────────────┤
                    ▼                                  ▼                                 ▼
         [Format Security Alert]            [Format Operations Log]           [Format Query Response]
         (HTTP 403 / RBAC Alert)          (HTTP 200 / Action Success)        (HTTP 200 / Multi-Agent)
                    │                                  │                                 │
                    └──────────────────────────────────┴─────────────────────────────────┘
                                                       │
                                                       ▼
                                            [Webhook JSON Response]
```

---

## 3. Supported Invocation Scenarios

### A. Execute an Operational Action (e.g. Add Property / Room / Bed / Deactivate User)

```bash
curl -X POST "http://localhost:5678/webhook/stayops-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add property StayOps Horizon at HSR Layout Bengaluru with 4 floors",
    "caller_role": "admin",
    "email": "admin@stayops.ai"
  }'
```

### B. Tenant Inquiry / Issue Submission

```bash
curl -X POST "http://localhost:5678/webhook/stayops-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create maintenance ticket for kitchen sink leakage in room 204",
    "caller_role": "tenant",
    "email": "resident@stayops.ai"
  }'
```

### C. RBAC Security Check (Tenant blocked from Admin Operation)

```bash
curl -X POST "http://localhost:5678/webhook/stayops-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Deactivate user Rohan",
    "caller_role": "tenant",
    "email": "resident@stayops.ai"
  }'
```
*Response*: HTTP 403 `[ALERT] StayOps Guardian: Permission Denied`.

---

## 4. Environment Variables in n8n

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `STAYOPS_API_URL` | `http://localhost:8000` | The backend FastAPI endpoint URL |
