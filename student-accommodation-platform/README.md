# AI-Powered Student Accommodation Discovery & Rental Platform

A web platform that helps students find PGs, flats and rental rooms near their college without brokers and without visiting dozens of properties. Students search in plain English ("single room near CGC Landran under ₹9,000 with AC"), owners list and improve their properties with AI-assisted feedback, and admins verify listings before they earn a **Verified** badge.

Built as a final-year B.Tech (CSE, AI/ML) Project-II.

## Table of contents

1. [Overview](#overview)
2. [Features](#features)
3. [How the AI features work](#how-the-ai-features-work)
4. [Architecture](#architecture)
5. [Tech stack](#tech-stack)
6. [Data model](#data-model)
7. [Project structure](#project-structure)
8. [Getting started](#getting-started)
9. [Configuration reference](#configuration-reference)
10. [Using the app](#using-the-app)
11. [API reference](#api-reference)
12. [Database migrations](#database-migrations)
13. [Troubleshooting](#troubleshooting)
14. [Security notes](#security-notes)
15. [Known limitations and future scope](#known-limitations-and-future-scope)
16. [Credits](#credits)

---

## Overview

### The problem

Students who move to a new city for college usually find accommodation through brokers, word of mouth and WhatsApp groups. The process is slow and costly: brokerage fees, repeated visits, listings that are incomplete or outdated, and generic property portals that cannot answer student-specific questions such as "how far is this from my college?" or "is food included?".

### The solution

One platform with three roles:

| Role | What they do |
|---|---|
| **Student** | Searches with filters or plain-English queries, searches by distance from their college, views listings with photos, and sends inquiries to owners |
| **Owner** | Lists properties, uploads photos, gets an AI-assisted quality check, and handles student inquiries |
| **Admin** | Reviews new listings and approves them (Verified badge) or hides them from search |

### What makes it different from a generic listings site

- **Natural-language search.** A language model turns a sentence into structured filters (budget, room type, amenities, distance), and the app shows what it understood so a misreading is visible, not silent.
- **Distance from *your* college.** Searches use a real geographic radius (PostGIS), and students can add their own college if it is not listed yet.
- **Listing-quality feedback.** Owners get a score and a list of what is missing, plus an AI-written description that is only allowed to use facts the owner already entered.
- **Trust.** Admin verification and a one-open-inquiry-per-listing rule keep the marketplace tidy.

---

## Features

### Student

- Sign up and log in as a student
- Search by city or area, maximum rent, room type (single, 2-sharing, 3+ sharing, full flat), and required AC, Wi-Fi or food
- **AI search box**: describe what you want in plain English
- **Near my college**: pick a college and a radius of 1, 2, 3 or 5 km
- **Add your own college** by searching OpenStreetMap, or by entering coordinates by hand
- Listing page with photos, amenities, price, address, a link to Google Maps, and the Verified badge
- **Send an inquiry** with a message, optional phone number and optional move-in date
- **My inquiries**: see whether the owner has been in touch

### Owner

- Sign up and log in as an owner
- Create listings (title, description, room type, rent, AC / Wi-Fi / food, address, city, coordinates)
- Upload photos right after creating a listing, or any time with **Add photos** on the dashboard
- Dashboard showing each listing's status: **Verified**, **Pending verification** or **Hidden by admin**, plus its photo count
- **Check quality**: a 0-100 score, a "to fix" list, an AI-suggested description you can edit and save, and tips
- **Inquiries** page: see who messaged you (name, email, phone, message, move-in date) and mark each as contacted or closed
- Delete listings

### Admin

- **Verify listings** queue, oldest first, showing photos, description, price, address and the owner's contact
- **Approve** (listing gets the Verified badge) or **Hide** (listing disappears from student search)
- Admin accounts cannot be created through signup; they are created with a script (see [Create an admin account](#5-create-your-accounts))

---

## How the AI features work

### 1. Natural-language search

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Frontend
    participant BE as FastAPI backend
    participant LLM as Groq via LangChain
    participant DB as PostgreSQL + PostGIS
    S->>FE: single room under 8000 near cgc landran with AC
    FE->>BE: POST /listings/search/natural (query, college_id)
    BE->>LLM: query plus extraction rules
    LLM-->>BE: structured filters (budget, room type, AC, ...)
    BE->>BE: match the college named in the text
    BE->>DB: filtered query plus radius search
    DB-->>BE: matching listings
    BE-->>FE: listings plus what was understood
    FE-->>S: results and the Searching for line
```

- The language model is given a fixed schema (minimum and maximum budget, room type, AC, Wi-Fi, food, city, distance) and strict rules: set a field only if the query implies it, never turn "not mentioned" into "must not have", and convert units (for example 500 m to 0.5 km).
- The structured result goes through the **same filtering function** the normal filter form uses, so there is one code path for filtering, reached two ways.
- The response includes the filters that were understood, and the UI shows them ("Searching for: Full flat, within 3 km of ..."). A wrong reading is visible.
- If no AI key is configured, the endpoint returns a clear "not configured" message and the rest of the site keeps working.

### 2. Near my college (distance search)

- Colleges are stored with a geographic point. A search near a college uses a PostGIS radius query (`ST_DWithin`), so the distance is real, not text matching.
- **College matching is deterministic, not AI.** The words in the query are matched against college names; if exactly one college is the best match it is used, and if two tie (for example two colleges abbreviated "CU") nothing is guessed.
- "Near X" with no distance uses a default radius of 3 km. A distance with no known college is reported as not applied, never guessed.
- **Student-added colleges.** A student searches for their college through OpenStreetMap's free place search (from their browser, when they press Find; there is no live autocomplete, which the service forbids). The chosen place is saved through `POST /colleges`. The server rejects points outside India, cleans the name, and reuses an existing college within 400 m instead of creating a duplicate. It also appends an abbreviation, so a college added as "Lovely Professional University" is stored as "Lovely Professional University (LPU)" and `near lpu` works for the next student.

### 3. Listing-quality analyzer

The check has two halves, deliberately separated:

**Rule-based (always works, no AI).** Each problem found costs points; the score is 100 minus the total.

| Check | Points lost |
|---|---|
| No photos | 25 |
| Fewer than 3 photos | 10 |
| No description | 25 |
| Description under 80 characters | 12 |
| No amenities ticked or listed | 10 |
| Address under 12 characters | 8 |
| Food or mess not mentioned (and food not ticked) | 8 |
| No mention of distance to campus | 10 |
| No mention of deposit, notice period or house rules | 7 |

The content checks (food, distance, rules) only run when a description exists.

**AI-assisted (needs the AI key).** The model writes an improved description and up to a few tips. Guard rails:

- It may only use the facts the owner entered. Where an important fact is missing (distance, deposit, notice period, food), it must leave a `[bracketed placeholder]`, and the **Use this description** button stays disabled until every bracket is replaced, so placeholders can never be published.
- **Invented-number guard.** If the draft contains a number that appears nowhere in the listing (an invented "5 minutes from campus", a different rent), the draft is discarded and the owner is told.
- **JSON fallback.** Some models intermittently fail to call the structured-output tool. The analyzer retries once in JSON mode before giving up.
- If the AI is unavailable, the score and the fix list still appear, with a plain message instead of an error. Provider error details are logged on the server and never sent to the browser.

---

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI["Next.js frontend<br/>React, TypeScript, Tailwind"]
    end
    subgraph Server["FastAPI backend"]
        API["REST API<br/>auth, listings, inquiries, admin"]
        AI["AI layer<br/>LangChain + Groq"]
        FILES["Photo storage<br/>local uploads folder"]
    end
    DB[("PostgreSQL + PostGIS<br/>hosted on Neon")]
    LLM["Groq LLM API"]
    OSM["OpenStreetMap<br/>place search"]

    UI -->|"JSON over HTTP with JWT"| API
    API --> DB
    API --> AI
    AI --> LLM
    API --> FILES
    UI -->|"college search"| OSM
```

- The **frontend** is a Next.js (App Router) single-page-style app. It stores the login token in the browser and calls the backend's REST API.
- The **backend** is a FastAPI app with routers per feature, SQLAlchemy models, and Pydantic schemas that validate every request and shape every response.
- The **database** is PostgreSQL with the PostGIS extension for geographic queries. Hosting it on Neon means no local database install.
- **Role checks happen on the server** for every protected endpoint, not just in the UI.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python, FastAPI, Uvicorn, Pydantic v2 |
| Database | PostgreSQL with PostGIS (GeoAlchemy2, Shapely), SQLAlchemy 2, Alembic migrations |
| Authentication | JWT (python-jose), bcrypt password hashing (passlib) |
| AI | LangChain with Groq (`langchain-groq`) for structured extraction and text generation |
| Optional tracing | LangSmith |
| Place search | OpenStreetMap Nominatim (called from the browser) |
| Hosting (database) | Neon (free tier), or a local PostGIS container via Docker |

Exact backend versions are pinned in `backend/requirements.txt`.

---

## Data model

```mermaid
erDiagram
    USERS ||--o{ LISTINGS : owns
    USERS ||--o{ INQUIRIES : sends
    LISTINGS ||--o{ INQUIRIES : receives
    LISTINGS ||--o{ LISTING_IMAGES : has
    LISTINGS }o--o{ AMENITIES : tagged_with
    COLLEGES |o--o{ LISTINGS : "near (optional)"

    USERS {
        uuid id PK
        string full_name
        string email UK
        string hashed_password
        string phone_number
        string role "student, owner or admin"
    }
    LISTINGS {
        uuid id PK
        uuid owner_id FK
        string title
        string room_type "single, shared_2, shared_3_plus or flat"
        decimal monthly_rent
        boolean has_ac
        boolean has_wifi
        boolean food_included
        geography location "point, SRID 4326"
        boolean is_verified
        boolean is_active
    }
    LISTING_IMAGES {
        uuid id PK
        uuid listing_id FK
        string url
    }
    AMENITIES {
        uuid id PK
        string name UK
    }
    COLLEGES {
        uuid id PK
        string name
        string city
        geography location "point, SRID 4326"
    }
    INQUIRIES {
        uuid id PK
        uuid listing_id FK
        uuid student_id FK
        text message
        string contact_phone
        date move_in_date
        string status "new, contacted or closed"
    }
```

Notes:

- A listing's `is_verified` and `is_active` flags drive moderation: **approve** sets verified and active; **hide** clears both and removes the listing from public search (the owner still sees it, marked hidden).
- `listings.college_id` exists in the schema but the current UI does not set it; distance search uses the listing's own coordinates.
- `inquiries.status` is a plain string validated by the API, so a new status needs no database migration.
- Deleting a listing deletes its photos, amenity links and inquiries (cascade).

---

## Project structure

```text
.
├── README.md
├── docker-compose.yml              Optional local PostgreSQL + PostGIS
├── backend/
│   ├── requirements.txt
│   ├── .env.example                Copy to .env and fill in
│   ├── alembic.ini
│   ├── alembic/versions/           Database migrations
│   ├── scripts/
│   │   ├── seed_colleges.py        Seeds starter colleges
│   │   └── make_admin.py           Promotes an account to admin
│   └── app/
│       ├── main.py                 App entry point, routers, CORS, /uploads
│       ├── core/                   Settings, JWT and password hashing, auth dependency
│       ├── db/                     Engine and session
│       ├── models/                 SQLAlchemy models (user, listing, college, inquiry, ...)
│       ├── schemas/                Pydantic request and response models
│       ├── routers/                auth, users, listings, images, colleges,
│       │                           inquiries, analysis, admin
│       ├── services/               listing_quality.py (rules), colleges.py (matching)
│       └── ai/                     query_parser.py (search), listing_analyzer.py (quality AI)
└── frontend/
    ├── package.json
    ├── .env.local.example
    └── src/app/
        ├── page.tsx                Home
        ├── login/  signup/         Authentication pages
        ├── (student)/              search, listing/[id], my-inquiries
        ├── (owner)/                dashboard, listings/new, inquiries
        ├── (admin)/                verify
        ├── components/             Reusable UI (cards, forms, panels, header)
        └── lib/                    API clients, auth context, helpers
```

---

## Getting started

### Prerequisites

| Tool | Version | Check with |
|---|---|---|
| Python | 3.10 or newer | `python --version` |
| Node.js | 20.9 or newer | `node --version` |
| Git | any recent | `git --version` |
| A Neon account | free | https://neon.tech |
| A Groq API key | free tier, optional | https://console.groq.com |

The Groq key is only needed for the AI features (natural-language search and the AI half of the quality check). Everything else works without it.

The commands below use **Windows PowerShell**. macOS and Linux equivalents are noted where they differ.

### 1. Get the code

```powershell
git clone <your-repository-url>
cd <repository-folder>        # the folder that contains backend/ and frontend/
```

### 2. Create the database

1. Create a free project at https://neon.tech.
2. In the Neon **SQL Editor**, enable PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Copy your connection string from the Neon dashboard. It looks like `postgresql://user:password@host/dbname?sslmode=require`. You will paste it into `backend/.env` in the next step, with `+psycopg2` added after `postgresql` (details below).

> Prefer a local database? Run `docker compose up -d` from the project root to start PostgreSQL with PostGIS on `localhost:5432`, and use `postgresql+psycopg2://postgres:postgres@localhost:5432/accommodation_db` as the `DATABASE_URL`.

### 3. Set up and run the backend

```powershell
cd backend

# create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1
# If PowerShell blocks the script, run this once in the same window and retry:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# create your environment file
Copy-Item .env.example .env
```

macOS and Linux:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

Now open `backend/.env` and fill it in (full reference in [Configuration reference](#configuration-reference)):

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>/<dbname>?sslmode=require
JWT_SECRET_KEY=<a long random string>
CORS_ORIGINS=["http://localhost:3000"]
GROQ_API_KEY=<your key, optional>
GROQ_MODEL=<a current Groq model name, optional>
```

Generate a secret for `JWT_SECRET_KEY` with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Create the tables, add starter colleges, and start the server:

```powershell
python -m alembic upgrade head
python -m scripts.seed_colleges
python -m uvicorn app.main:app --reload
```

The API is now running at http://localhost:8000. Check it:

- http://localhost:8000/health returns `{"status":"ok"}`
- http://localhost:8000/docs shows interactive API documentation

> **Always use `python -m ...`** (and make sure your prompt starts with `(venv)`). Bare `uvicorn` or `pip` commands can run a different Python than the one your packages were installed into, which causes confusing "module not found" errors.

### 4. Set up and run the frontend

Open a **second** terminal:

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local     # macOS/Linux: cp .env.local.example .env.local
npm run dev
```

The site is now at http://localhost:3000. The default `.env.local` already points at the backend on port 8000. Both servers must be running at the same time.

### 5. Create your accounts

The app has three roles, so create one account of each to try every feature.

1. **Student and owner:** open http://localhost:3000/signup and sign up once as a **Student** and once as an **Owner**, using different email addresses. Login is stored per browser, so use a normal window for one and a private window for the other.
2. **Admin:** admin accounts cannot be created through signup (that would let anyone make themselves an admin). Sign up normally with a third email, then promote it from the `backend` folder:
   ```powershell
   python -m scripts.make_admin your-admin@email.com
   ```
   Log out and back in so the site picks up the new role. The header then shows **Verify listings**.

### 6. Add some test data

Log in as the owner, open **My listings** then **New listing**, and create a few listings with coordinates near a seeded college. To get coordinates, right-click the building in Google Maps and click the numbers at the top of the menu to copy them (latitude first, then longitude). Upload photos on the next screen. Then follow the [demo walkthrough](#demo-walkthrough).

---

## Configuration reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLAlchemy URL. Must start with `postgresql+psycopg2://`. For Neon, end it with `?sslmode=require`. |
| `JWT_SECRET_KEY` | Yes | Secret used to sign login tokens. Use a long random value and never commit it. |
| `CORS_ORIGINS` | No | JSON list of allowed frontend origins. Default: `["http://localhost:3000"]`. Add your deployed site's address when you deploy. |
| `GROQ_API_KEY` | For AI features | Groq API key. Without it, AI search and the AI suggestions report "not configured" while everything else works. |
| `GROQ_MODEL` | For AI features | Name of the Groq model to use. Pick a current model that supports tool calling and JSON output. Groq retires models from time to time (for example `llama-3.3-70b-versatile` was retired on 16 August 2026), so check Groq's model list if the AI starts failing with "model not found". |
| `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` | No | Optional LangSmith tracing, useful for inspecting exactly what was sent to the model. |

Other values (token lifetime of 1 day, the `/api/v1` prefix) are defaults in `backend/app/core/config.py`.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | No | Backend API address. Default: `http://localhost:8000/api/v1`. Uploaded photos are served from the same host, without the `/api/v1` part. |
| `NEXT_PUBLIC_GEOCODER_URL` | No | A Nominatim-compatible search endpoint for the "add your college" panel. Default: OpenStreetMap's public Nominatim. |

---

## Using the app

### Pages

| Address | Who | What |
|---|---|---|
| `/` | Everyone | Home |
| `/signup`, `/login` | Everyone | Create an account (student or owner) and log in |
| `/search` | Everyone | Filters, AI search box, college selector |
| `/listing/<id>` | Everyone | Listing details and the inquiry form |
| `/my-inquiries` | Student | Inquiries you have sent and their status |
| `/dashboard` | Owner | Your listings: quality check, add photos, delete |
| `/listings/new` | Owner | Create a listing, then upload photos |
| `/inquiries` | Owner | Inquiries about your listings |
| `/verify` | Admin | Review queue for new listings |

Opening a page for the wrong role redirects you (for example, a student opening `/inquiries` goes to `/search`).

### Demo walkthrough

1. **Student: AI search.** On `/search`, type `single room near cgc landran under 9000 with AC` and press **Ask**. Note the "Searching for:" line showing what was understood.
2. **Student: change college.** Use **Near my college**, or click **My college isn't listed** to search for and add another college.
3. **Student: inquire.** Open a listing, write a message, and press **Send inquiry**. Sending a second one for the same listing is refused while the first is open.
4. **Owner: respond.** Open **Inquiries**, read the message and contact details, and press **Mark contacted**. The student's **My inquiries** page now says "The owner has been in touch".
5. **Owner: improve a listing.** On **My listings**, press **Add photos**, then **Check quality**. Edit the suggested description, replace any `[bracketed]` parts, press **Use this description**, then **Check again** to see the score rise.
6. **Admin: verify.** Open **Verify listings**. Approve one listing and hide another.
7. **Student: see the result.** Search again. The approved listing shows the **Verified listing** badge, and the hidden one is gone.

### Inquiry rules

- Only student accounts can send inquiries; an owner cannot inquire on their own listing.
- A message must be 10 to 1000 characters. Phone number and move-in date are optional, and the move-in date cannot be in the past.
- A student can have only one open (new or contacted) inquiry per listing. After the owner closes it, they can send another.
- The inquiry form tells the student that the owner will see their name, email and phone number.

### Photos

JPEG, PNG or WebP, up to 5 MB each. They are saved in `backend/uploads/` and served by the backend at `/uploads/...`.

---

## API reference

Base address: `http://localhost:8000/api/v1`. Interactive documentation with a "try it out" button is at http://localhost:8000/docs. To call protected endpoints there, log in through `POST /auth/login`, click **Authorize**, and paste the `access_token`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/signup` | Public | Create a student or owner account (admin is refused) |
| POST | `/auth/login` | Public | Log in, returns a JWT |
| GET | `/users/me` | Logged in | Current user |
| GET | `/listings` | Public | Search. Filters: `min_budget`, `max_budget`, `room_type`, `has_ac`, `has_wifi`, `food_included`, `city`, `lat` + `lng` + `max_distance_km`, `college_id` |
| GET | `/listings/{id}` | Public | One listing |
| POST | `/listings/search/natural` | Public | AI search: `{ "query": "...", "college_id": "..." }` |
| GET | `/listings/mine` | Owner | Your listings, including unverified and hidden ones |
| POST | `/listings` | Owner | Create a listing |
| PATCH | `/listings/{id}` | Listing owner or admin | Partial update |
| DELETE | `/listings/{id}` | Listing owner or admin | Delete |
| POST | `/listings/{id}/analyze` | Listing owner or admin | Quality score, issues, AI suggestions |
| POST | `/listings/{id}/images` | Listing owner or admin | Upload a photo (multipart) |
| DELETE | `/listings/{id}/images/{image_id}` | Listing owner or admin | Remove a photo |
| GET | `/colleges` | Public | All colleges |
| POST | `/colleges` | Logged in | Add a college (reuses one within 400 m) |
| POST | `/inquiries` | Student | Send an inquiry |
| GET | `/inquiries/mine` | Logged in | Inquiries you sent |
| GET | `/inquiries/received` | Owner | Inquiries about your listings |
| PATCH | `/inquiries/{id}` | Listing owner or admin | Set status: `new`, `contacted` or `closed` |
| GET | `/admin/listings/pending` | Admin | Review queue |
| POST | `/admin/listings/{id}/approve` | Admin | Mark verified |
| POST | `/admin/listings/{id}/reject` | Admin | Hide from search |
| GET | `/health` | Public | Health check (served at the site root, not under `/api/v1`) |

Example: search for single rooms under ₹8,000 with AC within 2 km of a point:

```text
GET /api/v1/listings?room_type=single&max_budget=8000&has_ac=true&lat=30.6865&lng=76.6647&max_distance_km=2
```

---

## Database migrations

The schema is managed with Alembic. Run these from `backend/` with the virtual environment active.

```powershell
python -m alembic upgrade head        # apply all migrations (use this on a fresh database)
python -m alembic current             # show which revision the database is on
python -m alembic history             # list all revisions
```

Creating a new migration after changing a model:

```powershell
python -m alembic revision --autogenerate -m "describe the change"
python -m alembic upgrade head
```

Always run `upgrade head` first. Creating a new migration while the database is behind produces the error `Target database is not up to date`.

> Check autogenerated migrations before applying them. PostGIS adds spatial indexes that autogenerate can mistake for something to drop; remove any unexpected `drop_index` lines.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `No module named ...` or an `ImportError` mentioning `pydantic_core` right after starting the server | The server was started with the wrong Python, not the virtual environment | Activate the venv (the prompt shows `(venv)`) and use `python -m uvicorn ...`. Or call `.\venv\Scripts\python.exe -m uvicorn ...` directly |
| `connection to server at "localhost", port 5432 failed` | `backend/.env` is missing or not being read | The file must be named exactly `.env`, sit inside `backend/`, and the server must be started from `backend/` |
| `could not translate host name "<your-project>..."` | `DATABASE_URL` still contains the placeholder from `.env.example` | Paste your real Neon connection string |
| `relation "users" does not exist` (or `"inquiries"`) | Migrations have not been applied | `python -m alembic upgrade head` |
| `Target database is not up to date` | You ran `alembic revision --autogenerate` while the database was behind | Run `python -m alembic upgrade head` first |
| `python-dotenv could not parse statement starting at line N` | A malformed line in `.env` (missing `=`, a key wrapped onto two lines, an unquoted value with spaces) | Make every line `NAME=value` or a `#` comment |
| Signup returns 500 mentioning `bcrypt ... __about__` | An incompatible newer `bcrypt` is installed | `bcrypt` is pinned to 4.0.1 in `requirements.txt`; reinstall with `python -m pip install -r requirements.txt` |
| AI search says it is not configured | `GROQ_API_KEY` or `GROQ_MODEL` missing | Set both in `backend/.env` and restart the server |
| AI suggestions missing, backend log shows `tool_use_failed` | The model did not produce a structured response | The analyzer retries in JSON mode automatically. If both attempts fail, try **Check again**, or switch `GROQ_MODEL` to another model |
| AI errors saying the model was not found or decommissioned | Groq retired the model | Choose a current model from Groq's model list and update `GROQ_MODEL` |
| `/admin/...` returns 404 | The server is running older code | Pull the latest code and restart the backend |
| Photos do not load | Backend not running, or files missing from `backend/uploads/` | Start the backend; re-upload if the folder was cleared |
| Browser console shows a CORS error | The frontend's address is not in `CORS_ORIGINS` | Add it to `CORS_ORIGINS` in `backend/.env` and restart |
| Search works but shows nothing near a college | No listing is within the radius | Listings need coordinates near the college; widen the distance or check the listing's latitude and longitude |
| "My college isn't listed" search fails | OpenStreetMap's search is unreachable or rate-limited | Use **Enter it by hand** in the same panel |
| PowerShell refuses to run `Activate.ps1` | Script execution policy | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then retry |
| `git push` is blocked by "secret scanning" | An API key is written in a tracked file | Remove the key from the code, rewrite the commit, and rotate the key (it must live only in `.env`) |

---

## Security notes

- Passwords are hashed with bcrypt and never stored or returned in plain text.
- Login tokens are JWTs signed with `JWT_SECRET_KEY` (HS256) and expire after 24 hours.
- Role checks run on the server for every protected endpoint; the UI redirects are a convenience, not the protection.
- **Admin accounts cannot be created through signup.** The signup endpoint refuses the admin role, and admins are created only with `scripts/make_admin.py` on the server.
- Secrets (database URL, JWT secret, API keys) belong only in `backend/.env`, which is git-ignored. Commit only `.env.example` with placeholders. If a real key is ever committed, rotate it; deleting the file does not remove it from git history.
- Provider error messages from the AI service are logged on the server and never returned to the browser.
- When a student sends an inquiry, the owner receives their name, email and any phone number given. The form says so before sending.
- Before deploying, set a strong `JWT_SECRET_KEY`, restrict `CORS_ORIGINS` to your real site, and serve everything over HTTPS.

---

## Known limitations and future scope

What this project deliberately does not do yet:

| Area | Status | Notes |
|---|---|---|
| Real-time chat | Not built | Replaced by the inquiry and response-status system; live chat is the natural next step |
| Reviews and ratings | Not built | Planned |
| Estimated monthly cost | Not built | Only monthly rent is stored; deposit and other charges are a planned addition |
| Recommendation ranking | Not built | Results are filtered and sorted newest first, not scored by fit |
| Editing a listing | Partial | The API supports it and the description can be changed from the quality panel, but there is no full edit screen yet |
| Photo storage | Local disk | Files live in `backend/uploads/`. Move to a cloud image host (for example Cloudinary) before deploying, because most hosts wipe local files on redeploy |
| Deployment | Not deployed | Runs locally; the frontend suits Vercel and the backend suits Render or Railway |
| Automated tests | Not included | Behaviour was checked manually and with throwaway scripts; a pytest suite is a planned addition |
| College list moderation | None | Any logged-in user can add a college. There is no admin screen to edit or remove one yet |
| AI rate limiting | None | A deployed instance should limit calls to the AI endpoints |
| Notifications | None | No email or push alerts for new inquiries |

Ideas for future work: live chat between students and owners, reviews, a fit-based ranking of results, an admin tool for managing colleges, email notifications, an Android client, and virtual tours.

---

## Credits

- Built with [FastAPI](https://fastapi.tiangolo.com), [Next.js](https://nextjs.org), [SQLAlchemy](https://www.sqlalchemy.org), [GeoAlchemy2](https://geoalchemy-2.readthedocs.io), [LangChain](https://www.langchain.com), [Tailwind CSS](https://tailwindcss.com), and [Alembic](https://alembic.sqlalchemy.org).
- Language model inference by [Groq](https://groq.com); database hosting by [Neon](https://neon.tech).
- Place search data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), through Nominatim.
- Author: **Naksh Bali, Lavisha**, B.Tech Computer Science and Engineering (AI/ML), CGC Landran, Mohali. Final-year Project-II.