# Scanno

Product review diary — scan barcodes, rate products, share verdicts (`buy_again` / `never_again`).

## Stack

- **Backend:** Django 5 + Django REST Framework + PostgreSQL (SQLite for local without Docker)
- **Web:** Next.js (App Router) + TypeScript + Tailwind + PWA
- **Mobile:** Expo / React Native (barcode scanner)
- **Catalog:** Open Food Facts lookup
- **API docs:** http://localhost:8000/api/docs/ (Swagger / OpenAPI)

## Quick start (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8000/api/v1/ |
| OpenAPI | http://localhost:8000/api/docs/ |
| Admin | http://localhost:8000/admin/ |

Dev admin (seeded): `admin@scanno.local` / `admin123`

## Quick start (local)

See [docs/DEPLOY.md](docs/DEPLOY.md).

```bash
# API
cd backend && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate && python manage.py seed_dev && python manage.py runserver

# Web
cd web && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start
```

## Structure

```
scanno/
  backend/     # Django + DRF
  web/         # Next.js
  mobile/      # Expo app
  docs/        # Deploy & launch notes
  docker-compose.yml
```

## MVP features

- Register / login (JWT, email)
- Product search + barcode lookup (Open Food Facts)
- Reviews with rating, verdict, photos, public/private
- Product stats (avg rating, never-again %)
- Comments + report endpoint + Django admin moderation
- Public user profiles
- PWA manifest + service worker
- PostHog hook (optional env key)

## Collaborators

1. Clone this repo and open the **repository root** in Cursor.
2. Follow [docs/ONBOARDING.md](docs/ONBOARDING.md).
3. Project brief for AI: [AGENTS.md](AGENTS.md). Product rules: [docs/PRODUCT_IDENTITY.md](docs/PRODUCT_IDENTITY.md).
4. Backlog & Trello import: [docs/BACKLOG.md](docs/BACKLOG.md), [docs/trello-scanno-mvp.json](docs/trello-scanno-mvp.json).

Working brand candidate: **Rebuyly** (repo/code still use Scanno until rename is decided).
