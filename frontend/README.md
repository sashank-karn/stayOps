# Frontend (Next.js) — Person 3

The owner dashboard. Phase 1 ships a minimal App Router skeleton that pings the backend
`/health` endpoint so the full stack is verifiably wired together.

## Run

```bash
cd frontend
npm install
cp .env.local.example .env.local   # optional; defaults to http://localhost:8000
npm run dev                        # http://localhost:3000
```

## Layout

```
frontend/
├── app/
│   ├── layout.tsx     # root layout
│   ├── page.tsx       # landing page + backend health check
│   └── globals.css
├── next.config.js
├── tsconfig.json
└── package.json
```

## Coming in later phases

Login (Phase 3), owner dashboard with overview / leads / rent / maintenance / revenue &
vacancy, and the **Agent Activity** view (Phase 13) that visually proves multi-agent
collaboration.
