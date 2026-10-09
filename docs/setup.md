# Setup (Windows 11)

Prerequisites to install on each developer's machine. Check what you already have first.

```powershell
git --version
python --version      # need 3.11+
node --version        # need 18+ (20 recommended)
docker --version      # optional but recommended
```

## 1. Git

Install **Git for Windows**: https://git-scm.com/download/win
Then set your identity (once):

```powershell
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

## 2. Python 3.11+

Install from https://www.python.org/downloads/ (tick **"Add python.exe to PATH"**).
Verify: `python --version`.

## 3. Node.js 20 LTS

Install from https://nodejs.org/ (LTS). Verify: `node --version` and `npm --version`.

## 4. Docker Desktop (recommended)

Install from https://www.docker.com/products/docker-desktop/. Needed to run Postgres +
pgvector and the full stack with one command. If you skip Docker, install PostgreSQL 16
manually and enable the `vector` extension yourself.

Verify: `docker --version` and `docker compose version`.

## 5. Project setup

```powershell
git clone <your-repo-url> stayops-ai
cd stayops-ai
copy .env.example .env          # then edit values

# Backend (run from repo root)
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload      # http://localhost:8000/health

# Frontend (new terminal)
cd frontend
npm install
npm run dev                                  # http://localhost:3000
```

With Docker:

```powershell
docker compose up --build
```

## Troubleshooting

- **`ModuleNotFoundError: shared`** — run uvicorn/pytest from the **repo root**, not from
  inside `backend/`.
- **`uvicorn` not found** — activate the venv (`.venv\Scripts\activate`) first.
- **Port already in use** — change `BACKEND_PORT` in `.env` or stop the other process.
