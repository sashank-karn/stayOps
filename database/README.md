# Database — Person 1

PostgreSQL + **pgvector**. Phase 1 provides the container config and the extension
bootstrap; the relational schema and migrations arrive in Phase 2.

## Planned tables (Phase 2)

Users, Properties, Rooms, Tenants, Leads, Bookings, Payments, MaintenanceTickets,
Vendors, AgentTasks, AgentMessages, AgentLogs, Notifications, and a Knowledge/Policies
table (with a `vector` column for pgvector-backed long-term memory).

The schema is designed to support multi-agent workflows: `AgentTasks`, `AgentMessages`,
and `AgentLogs` persist every hand-off so the dashboard can replay agent collaboration.

## Layout

```
database/
├── init/            # SQL run on first DB boot (extensions)
│   └── 01_init_extensions.sql
└── migrations/      # Alembic migrations (Phase 2)
```

## Local database (Docker)

```bash
docker compose up db        # starts Postgres 16 + pgvector on localhost:5432
```
