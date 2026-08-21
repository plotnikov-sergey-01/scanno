# Onboarding (second developer)

## 1. Access

1. Accept the **GitHub** invite to this repository (Write or higher).
2. Install **Cursor** with your own account + Pro (if provided).
3. Clone and open the **repo root** in Cursor (folder that contains `docker-compose.yml`, not only `web/` or `backend/`).

```bash
git clone <REPO_URL> scanno
cd scanno
```

Cursor will pick up `AGENTS.md` and `.cursor/rules/` automatically. Chat history is **per person** — shared product context lives in the repo docs/rules.

## 2. Prerequisites

- Docker Desktop (recommended) **or** Python 3.12+, Node 20+
- Git

## 3. First run (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8000/api/v1/ |
| OpenAPI | http://localhost:8000/api/docs/ |
| Admin | http://localhost:8000/admin/ |
| MinIO API | http://localhost:9000 |
| MinIO console | http://localhost:9001 |

Seeded admin: `admin@scanno.local` / `admin123`  
Demo user (if seeded): `demo@scanno.local` / `demo12345`

Copy env templates only if you run without Docker:

```bash
copy backend\.env.example backend\.env
copy web\.env.example web\.env.local
```

Never commit real `.env` files.

## 4. Without Docker

See [DEPLOY.md](./DEPLOY.md). Typical flow:

```bash
# API
cd backend
python -m venv venv
venv\Scripts\activate   # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_dev
python manage.py runserver

# Web (other terminal)
cd web
npm install
npm run dev
```

Port **3000** busy (`EADDRINUSE`): stop the old Node process, then retry `npm run dev`.

## 5. Mobile (optional)

```bash
cd mobile
npm install
npx expo start
```

Point the app at your machine API (see `mobile/lib/api.ts` / env). Physical device needs your LAN IP, not `localhost`.

## 6. Useful docs

| Doc | Purpose |
|-----|---------|
| [PRODUCT_IDENTITY.md](./PRODUCT_IDENTITY.md) | Barcodes, ownership, review rules |
| [OFF_IMPORT.md](./OFF_IMPORT.md) | Open Food Facts import |
| [DEPLOY.md](./DEPLOY.md) | Local + production checklist |
| [LAUNCH.md](./LAUNCH.md) | Go-to-market notes |
| [../AGENTS.md](../AGENTS.md) | AI/agent project brief |

## 7. Git workflow

- Branch from `master` (or `main` if renamed): `feature/…` or `fix/…`
- Open a PR for review before merging to the default branch
- Do not force-push the default branch
- Do not commit secrets, `node_modules`, `.next`, `venv`, SQLite dumps with prod data

## 8. DigitalOcean / SSH (when invited)

- Join the **DigitalOcean Team** with your own account (no shared owner password)
- Add **your** SSH public key to the droplet / team keys
- Staging URL and env vars come from the owner via a password manager — not chat/git
