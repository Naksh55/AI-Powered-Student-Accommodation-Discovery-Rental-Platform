# Frontend — Student Accommodation Platform

Next.js (App Router) + TypeScript + Tailwind.

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env file (points at the local backend by default):
   ```
   cp .env.local.example .env.local
   ```
3. Run the dev server:
   ```
   npm run dev
   ```

## Route structure

Route groups mirror the three product modules — the parentheses mean they
don't add a URL segment:

- `src/app/(student)/search` — structured + (later) natural-language search
- `src/app/(student)/listing/[id]` — listing detail page
- `src/app/(owner)/dashboard` — owner's listings, inquiries, chat
- `src/app/(owner)/listings/new` — create/edit listing form
- `src/app/(admin)/verify` — admin verification queue

`src/app/lib/api.ts` is the single place that talks to the backend —
`getListings(filters)` already matches every filter the search API supports.

## What's next

Week 3 builds the real filter UI, listing cards, and map view on top of
`getListings()`. Week 4 builds the owner listing form on top of the
create/update endpoints that already exist on the backend.
