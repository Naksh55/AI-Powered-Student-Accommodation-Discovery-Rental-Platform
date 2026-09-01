# AI-Powered Student Accommodation Discovery & Rental Platform

Final-year Project-II. See `/backend/README.md` and `/frontend/README.md`
for setup. Docker Compose at the root starts a local Postgres+PostGIS
instance both of them expect.

## Progress

- **Milestone 1 (Foundation & Core Backend)** — done: DB schema, auth,
  listing CRUD, structured + PostGIS geo search, image upload.
- **Milestone 2 (Full Student & Owner Web App)** — next: real filter UI,
  listing cards, map view, owner dashboard forms.
- **Milestone 3 (AI Layer & Chat)** — natural-language search via
  LangChain, AI listing-quality analyzer, WebSocket chat, inquiries.
- **Milestone 4 (Admin, Polish, Deploy)** — verification queue, testing,
  deployment.

## Quick start

```bash
docker compose up -d          # start Postgres + PostGIS

cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs

# in a second terminal
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                     # http://localhost:3000
```
