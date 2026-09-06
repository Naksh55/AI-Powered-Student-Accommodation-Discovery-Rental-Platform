# AI-Powered Student Accommodation Discovery & Rental Platform

Final-year Project-II. See `/backend/README.md` and `/frontend/README.md`
for setup.

Database: this project uses [Neon](https://neon.tech) (cloud Postgres +
PostGIS) by default, so no local Postgres or Docker install is required —
useful if you're short on laptop disk space. A `docker-compose.yml` is
still included at the root if you'd rather run Postgres+PostGIS locally
instead; use one or the other, not both.

## Progress

- **Milestone 1 (Foundation & Core Backend)** — done: DB schema, auth,
  listing CRUD, structured + PostGIS geo search, image upload.
- **Milestone 2 (Full Student & Owner Web App)** — next: real filter UI,
  listing cards, map view, owner dashboard forms.
- **Milestone 3 (AI Layer & Chat)** — natural-language search via
  LangChain, AI listing-quality analyzer, WebSocket chat, inquiries.
- **Milestone 4 (Admin, Polish, Deploy)** — verification queue, testing,
  deployment.

## Quick start (Neon — recommended, no local DB install)

```bash
# 1. Create a free project at https://neon.tech
# 2. In the Neon SQL Editor: CREATE EXTENSION IF NOT EXISTS postgis;
# 3. Copy your connection string

cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # paste your Neon connection string into DATABASE_URL
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs

# in a second terminal
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                     # http://localhost:3000
```

## Quick start (local Postgres via Docker — alternative)

```bash
docker compose up -d            # start Postgres + PostGIS locally
# then follow the same backend/frontend steps above, but leave
# DATABASE_URL in backend/.env pointed at localhost instead of Neon
```
