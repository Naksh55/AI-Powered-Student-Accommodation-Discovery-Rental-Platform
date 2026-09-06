# Backend — Student Accommodation Platform API

FastAPI + PostgreSQL/PostGIS backend.

## Local setup

1. Database — using [Neon](https://neon.tech) (cloud Postgres + PostGIS, no local install):
   - Create a free Neon project
   - In the Neon SQL Editor, run: `CREATE EXTENSION IF NOT EXISTS postgis;`
   - Copy the connection string Neon gives you

   (If you'd rather run Postgres locally instead, `docker compose up -d` from
   the project root starts a Postgres+PostGIS container — see the root
   README for that option.)
2. Create a virtualenv and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Copy the env file and paste your Neon connection string into `DATABASE_URL`:
   ```
   cp .env.example .env
   ```
4. Run the first migration:
   ```
   alembic revision --autogenerate -m "initial schema"
   alembic upgrade head
   ```
5. Start the API:
   ```
   uvicorn app.main:app --reload
   ```
6. Open http://localhost:8000/docs for interactive API docs.

## What's built (Weeks 1–2)

- Auth: `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` (JWT), `GET /api/v1/users/me`
- Listings: full CRUD at `/api/v1/listings`, owner-only write access
- Search: `GET /api/v1/listings` supports `min_budget`, `max_budget`, `room_type`,
  `has_ac`, `has_wifi`, `food_included`, `city`, and `lat`/`lng`/`max_distance_km`
  for PostGIS-backed radius search
- Images: `POST /api/v1/listings/{id}/images` (local disk in dev — swap
  `_save_locally` in `app/routers/images.py` for Cloudinary/Firebase before deploying)

## What's next

- Milestone 3: a LangChain chain that turns a natural-language query into
  the same query params `GET /listings` already accepts, plus the AI
  listing-quality analyzer and chat/inquiry endpoints
- Milestone 4: admin verification endpoints, deployment
