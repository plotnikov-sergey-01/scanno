# AGENTS.md — context for Cursor / AI collaborators

Working name: **Scanno** (brand candidate: **Rebuyly** — not finalized; do not rename the repo/package massively until decided).

## What this product is

Barcode → product card → personal taste diary + public reviews. Verdicts: `buy_again` / `never_again` / neutral. Later: nutrition/E-numbers, price compare, affiliates. Not a pantry/expiry app; not Yuka-only health scoring.

## Stack

| Layer | Tech |
|-------|------|
| API | Django 5 + DRF + JWT (email login) |
| DB | PostgreSQL (Docker); SQLite OK locally if `DATABASE_URL` unset |
| Media | MinIO (S3-compatible) in Docker; Spaces/R2 later |
| Web | Next.js App Router + TS + Tailwind + PWA |
| Mobile | Expo skeleton (`mobile/`) |
| Catalog | Open Food Facts (`import_off_popular`, barcode lookup) |

## Repo layout

```
backend/     # Django apps: accounts, catalog, reviews, moderation
web/         # Next.js
mobile/      # Expo
docs/        # DEPLOY, LAUNCH, PRODUCT_IDENTITY, OFF_IMPORT, ONBOARDING
docker-compose.yml
```

## Local run (preferred)

```bash
docker compose up --build
```

- Web http://localhost:3000  
- API http://localhost:8000/api/v1/  
- Docs http://localhost:8000/api/docs/  
- Admin http://localhost:8000/admin/ — seed: `admin@scanno.local` / `admin123`

Without Docker: see `docs/DEPLOY.md` and `docs/ONBOARDING.md`.

## Product rules (do not break casually)

See `docs/PRODUCT_IDENTITY.md`.

- One review per user per product (edits overwrite).
- Barcode is the global key; duplicates redirect / `already_exists`.
- `source=catalog` (OFF): main product photo locked; users put photos on reviews.
- `source=user`: only `created_by` edits product photo/details until promoted.

## Secrets

Never commit `.env`, `web/.env.local`, `mobile/.env`, keys, or production credentials. Use `*.example` files only.

## Agent / PR habits

- Prefer small, focused diffs; match existing style.
- Do not expand scope into deploy infra or renames unless asked.
- After substantive API changes, note OpenAPI / `docs/` updates if behavior changed.
- Commits: clear why; no force-push to `main`/`master` unless owner asks.
