# Deployment

## Local (Docker)

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000/api/v1/
- Docs: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/ (`admin@scanno.local` / `admin123` after seed)

## Local without Docker (SQLite)

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Ensure DATABASE_URL is unset for SQLite
python manage.py migrate
python manage.py seed_dev
python manage.py runserver
```

```bash
cd web
npm install
copy .env.example .env.local
npm run dev
```

---

## Production on DigitalOcean VPS (recommended for MVP)

One droplet runs everything: PostgreSQL, MinIO (S3-compatible storage), Django API, Next.js web. **Caddy** on the host terminates HTTPS and proxies to Docker on `127.0.0.1`.

### Architecture

```
Internet
   │
   ├─ app.example.com  ──► Caddy ──► web:3000
   ├─ api.example.com  ──► Caddy ──► api:8000  (gunicorn)
   └─ media.example.com ──► Caddy ──► minio:9000 (public read bucket)

Docker network (internal): db, minio, api, web
```

Staging and production can share one droplet with different subdomains (`staging-app.`, `staging-api.`) or use separate droplets later.

### 1. Droplet sizing

| Phase | Droplet | Notes |
|-------|---------|-------|
| Staging / friends beta | **Basic 2 GB** | OK for light traffic; build `web` image may swap briefly |
| Comfortable MVP | **Basic 4 GB** | Recommended default |
| Growth | 4–8 GB or split DB to managed Postgres | See [Managed DB](#later-managed-postgresql--spaces) below |

- **Region:** closest to your users (e.g. Frankfurt `fra1`, Amsterdam `ams3`).
- **Image:** Ubuntu 24.04 LTS.
- **Auth:** SSH keys only (add your key + second dev's key in DO Team).
- Optional: enable **backups** on the droplet.

### 2. DNS (at your registrar or Cloudflare)

Create **A records** pointing to the droplet's public IPv4:

| Host | Purpose |
|------|---------|
| `app` | Next.js PWA |
| `api` | Django REST API + OpenAPI |
| `media` | MinIO public object URLs |

Example: `app.example.com`, `api.example.com`, `media.example.com`.

Wait for DNS to propagate before starting Caddy (Let's Encrypt needs valid DNS).

### 3. Server bootstrap

SSH in as root (or a sudo user):

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git ufw

# Docker (official convenience script)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
# log out and back in so docker group applies

# Firewall: SSH + HTTP/S only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Install **Caddy** (automatic HTTPS):

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 4. Clone repo

```bash
mkdir -p /opt/scanno && cd /opt/scanno
git clone https://github.com/plotnikov-sergey-01/scanno.git .
# or: git pull for updates
```

### 5. Environment files (never commit these)

Copy examples and edit domains/passwords:

```bash
cp .env.production.example .env
cp backend/.env.production.example backend/.env
```

**Root `.env`** — Postgres/MinIO passwords and public API URL for the web build:

- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` — long random strings (same value in `backend/.env` where noted).
- `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1` — must match your real `api` subdomain.

**`backend/.env`** — Django settings:

- `DJANGO_SECRET_KEY` — e.g. `openssl rand -hex 32`
- `DJANGO_DEBUG=0`
- `ALLOWED_HOSTS=api.example.com,localhost,127.0.0.1`
- `DATABASE_URL=postgres://scanno:<POSTGRES_PASSWORD>@db:5432/scanno`
- `CORS_ALLOWED_ORIGINS=https://app.example.com`
- `USE_S3=1`, MinIO credentials matching root `.env`
- `AWS_S3_ENDPOINT_URL=http://minio:9000` (internal Docker hostname)
- `AWS_S3_CUSTOM_DOMAIN=media.example.com/scanno` (public HTTPS URL for browsers)

Generate secrets:

```bash
openssl rand -hex 32   # DJANGO_SECRET_KEY
openssl rand -base64 24   # passwords
```

### 6. Caddy reverse proxy

```bash
cp deploy/Caddyfile.example /etc/caddy/Caddyfile
# Edit: replace example.com with your domain
nano /etc/caddy/Caddyfile
systemctl enable caddy
systemctl reload caddy
```

Caddy obtains Let's Encrypt certificates automatically. App and API are only bound to localhost inside Docker; only Caddy is exposed on 80/443.

### 7. Build and start

From repo root:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build of `web` can take several minutes on a 2 GB droplet.

Check logs:

```bash
docker compose -f docker-compose.prod.yml logs -f api web
```

Create admin (no `seed_dev` in production):

```bash
docker compose -f docker-compose.prod.yml exec api python manage.py createsuperuser
```

Optional — import popular OFF products:

```bash
docker compose -f docker-compose.prod.yml exec api python manage.py import_off_popular
```

### 8. Smoke test

- https://app.example.com — home, login, scan flow
- https://api.example.com/api/docs/ — OpenAPI
- https://api.example.com/admin/ — Django admin
- Upload a review photo — URL should use `https://media.example.com/...`

Share **https://app.example.com** with friends (not the raw IP).

### 9. Deploy updates

```bash
cd /opt/scanno
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

If only backend code changed and `NEXT_PUBLIC_*` is unchanged, rebuild API only:

```bash
docker compose -f docker-compose.prod.yml up -d --build api
```

Rebuild `web` when frontend or `NEXT_PUBLIC_API_URL` changes.

### 10. Backups (minimum)

- **Postgres:** periodic `pg_dump` from the `db` container to off-droplet storage.
- **MinIO:** sync Docker volume `minio_data` or use `mc mirror`.
- Enable DO droplet snapshots before big releases.

Example dump:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U scanno scanno > scanno-$(date +%F).sql
```

---

## Production checklist

1. Strong `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, real `ALLOWED_HOSTS`.
2. Unique Postgres and MinIO passwords; do not reuse dev defaults.
3. HTTPS on all public hostnames (Caddy).
4. `CORS_ALLOWED_ORIGINS` matches exactly `https://app.<domain>` (no trailing slash).
5. `NEXT_PUBLIC_API_URL` uses HTTPS and is set **at web image build time** (Docker build arg).
6. Create a real superuser; never run `seed_dev` in production.
7. Optionally set `NEXT_PUBLIC_POSTHOG_KEY` for analytics.
8. Restrict SSH; keep system and Docker images updated.

---

## Later: managed PostgreSQL + Spaces

When traffic or ops burden grows:

1. **DigitalOcean Managed PostgreSQL** — set `DATABASE_URL` to the managed connection string (SSL params from DO panel). Remove or stop the `db` service in a forked compose file.
2. **DigitalOcean Spaces** (or Cloudflare R2) — set `USE_S3=1`, real credentials and endpoint from the provider; drop MinIO and `media` subdomain if using a CDN URL.
3. **Split web to Vercel** — deploy `web/` separately; point `NEXT_PUBLIC_API_URL` at `api.example.com`; keep API + DB on VPS or move API to App Platform.

---

## Alternative: API only on VPS, web on Vercel

1. Deploy backend with `docker compose -f docker-compose.prod.yml up -d --build api db minio minio-init` (omit `web`).
2. Caddy only for `api` and `media` subdomains.
3. Vercel project from `web/` with env `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1`.
4. Add Vercel preview/production URL to `CORS_ALLOWED_ORIGINS`.

---

## First users

- Invite friends to scan 10 products they already regret buying.
- Seed popular local SKUs via barcode lookup or `import_off_popular`.
- Share PWA "Add to Home Screen" for aisle use before native apps ship.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Caddy fails to get certificate | DNS A records not pointing to VPS yet |
| CORS errors in browser | `CORS_ALLOWED_ORIGINS` missing `https://app...` or wrong scheme |
| Web calls wrong API | Rebuild `web` after changing `NEXT_PUBLIC_API_URL` |
| Broken image URLs | `AWS_S3_CUSTOM_DOMAIN` must match Caddy `media` host + bucket path |
| 502 from Caddy | Stack not up — `docker compose ... ps` and check api/web logs |
| Out of memory on build | Add swap or use a 4 GB droplet |
