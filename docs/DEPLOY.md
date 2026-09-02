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

## Production on DigitalOcean VPS

**Django, PostgreSQL, MinIO и Next.js ставить на сервер отдельно не нужно** — всё крутится в Docker-контейнерах из репозитория. На VPS ты устанавливаешь только:

| Что | Зачем |
|-----|--------|
| **Docker** (+ Compose) | Запуск db, minio, api, web |
| **Git** | `git clone` / обновления |
| **UFW** (firewall) | Открыть нужные порты |
| **Caddy** | Только когда появится **домен** и нужен HTTPS |

Ни Python, ни Node, ни `pip install django` на хосте не требуются.

Два сценария:

1. **[Старт без домена (голый IP)](#start-without-a-domain-bare-ip)** — твой случай сейчас. HTTP, порты `3000` / `8000` / `9000`.
2. **[С доменом + HTTPS](#production-with-a-domain-https)** — когда купишь домен и настроишь DNS.

---

## Start without a domain (bare IP)

Подходит для первого деплоя и тестов с друзьями по ссылке `http://ВАШ_IP:3000`.

Let's Encrypt **не выдаёт** сертификат на голый IP, поэтому HTTPS пока нет — это нормально для staging.

### Шаг 0. Droplet в DigitalOcean

1. Create Droplet → **Ubuntu 24.04**, **2–4 GB RAM**.
2. Authentication → **SSH key** (не пароль).
3. Запиши **Public IPv4** из панели, например `159.89.1.2` — дальше везде подставляешь свой IP.

### Шаг 1. Подключиться по SSH

```bash
ssh root@159.89.1.2
```

(или `ssh deploy@...`, если создал отдельного пользователя.)

### Шаг 2. Установить Docker, Git, firewall

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git ufw

curl -fsSL https://get.docker.com | sh

ufw allow OpenSSH
ufw allow 3000/tcp
ufw allow 8000/tcp
ufw allow 9000/tcp
ufw enable
```

Caddy **не ставь** — домена пока нет.

### Шаг 3. Клонировать репозиторий

```bash
mkdir -p /opt/scanno && cd /opt/scanno
git clone https://github.com/plotnikov-sergey-01/scanno.git .
```

### Шаг 4. Сгенерировать пароли

На сервере:

```bash
openssl rand -hex 32          # → DJANGO_SECRET_KEY
openssl rand -base64 24       # → POSTGRES_PASSWORD и MINIO_ROOT_PASSWORD (один и тот же)
```

Запиши оба значения — они понадобятся в двух файлах.

### Шаг 5. Создать файл `.env` в корне репозитория

```bash
cp .env.production.ip.example .env
nano .env
```

Замени **`159.89.1.2`** на свой IP и **`K7mP9xR2vN4wQ8sL1tJ6hF0`** на пароль из шага 4.

Пример готового `.env` (если IP = `159.89.1.2`, пароль = `MySecretPass123`):

```env
POSTGRES_DB=scanno
POSTGRES_USER=scanno
POSTGRES_PASSWORD=MySecretPass123

MINIO_ROOT_USER=scanno
MINIO_ROOT_PASSWORD=MySecretPass123
AWS_STORAGE_BUCKET_NAME=scanno

NEXT_PUBLIC_API_URL=http://159.89.1.2:8000/api/v1
```

**Что здесь важно:**

- `POSTGRES_PASSWORD` — пароль базы внутри Docker (не путать с Django).
- `MINIO_ROOT_PASSWORD` — пароль хранилища картинок; `AWS_SECRET_ACCESS_KEY` в backend должен совпадать.
- `NEXT_PUBLIC_API_URL` — **полный URL API**, который браузер пользователя будет вызывать. Формат: `http://ВАШ_IP:8000/api/v1` (без слэша в конце). Зашивается в образ `web` при сборке.

### Шаг 6. Создать `backend/.env` (настройки Django)

```bash
cp backend/.env.production.ip.example backend/.env
nano backend/.env
```

Пример готового `backend/.env`:

```env
DJANGO_SECRET_KEY=вставь_результат_openssl_rand_hex_32
DJANGO_DEBUG=0
ALLOWED_HOSTS=159.89.1.2,localhost,127.0.0.1

DATABASE_URL=postgres://scanno:MySecretPass123@db:5432/scanno

CORS_ALLOWED_ORIGINS=http://159.89.1.2:3000

USE_S3=1
AWS_ACCESS_KEY_ID=scanno
AWS_SECRET_ACCESS_KEY=MySecretPass123
AWS_STORAGE_BUCKET_NAME=scanno
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_CUSTOM_DOMAIN=159.89.1.2:9000/scanno

OPEN_FOOD_FACTS_USER_AGENT=Scanno/1.0 (you@example.com)
```

**Построчно:**

| Переменная | Что поставить |
|------------|----------------|
| `DJANGO_SECRET_KEY` | случайная строка (`openssl rand -hex 32`) |
| `DJANGO_DEBUG` | `0` на сервере (не `1`) |
| `ALLOWED_HOSTS` | твой IP + `localhost,127.0.0.1` |
| `DATABASE_URL` | `postgres://scanno:<тот_же_пароль_что_POSTGRES_PASSWORD>@db:5432/scanno` — хост **`db`** это имя сервиса в Docker, не IP |
| `CORS_ALLOWED_ORIGINS` | `http://ВАШ_IP:3000` — откуда открывается фронт |
| `USE_S3` | `1` — картинки в MinIO |
| `AWS_ACCESS_KEY_ID` | `scanno` (= `MINIO_ROOT_USER` из корневого `.env`) |
| `AWS_SECRET_ACCESS_KEY` | тот же пароль, что `MINIO_ROOT_PASSWORD` |
| `AWS_S3_ENDPOINT_URL` | `http://minio:9000` — **внутри** Docker, не менять |
| `AWS_S3_CUSTOM_DOMAIN` | `ВАШ_IP:9000/scanno` — как браузер качает фото |
| `OPEN_FOOD_FACTS_USER_AGENT` | любой контактный email |

Файлы `.env` и `backend/.env` **не коммитить** — они уже в `.gitignore`.

### Шаг 7. Собрать и запустить

```bash
cd /opt/scanno
docker compose -f docker-compose.prod.ip.yml up -d --build
```

Первая сборка `web` может занять 5–15 минут.

Проверить:

```bash
docker compose -f docker-compose.prod.ip.yml ps
docker compose -f docker-compose.prod.ip.yml logs -f api web
```

### Шаг 8. Создать админа Django

```bash
docker compose -f docker-compose.prod.ip.yml exec api python manage.py createsuperuser
```

(В prod **`seed_dev` не запускается** — только свой superuser.)

### Шаг 9. Проверить в браузере

| URL | Что должно открыться |
|-----|----------------------|
| http://159.89.1.2:3000 | веб-приложение |
| http://159.89.1.2:8000/api/docs/ | Swagger API |
| http://159.89.1.2:8000/admin/ | Django admin |

Ссылку для друзей: **`http://ВАШ_IP:3000`**.

### Обновление кода

```bash
cd /opt/scanno
git pull
docker compose -f docker-compose.prod.ip.yml up -d --build
```

Если менял только backend — `--build api`. Если менял `NEXT_PUBLIC_API_URL` или фронт — пересобирай `web`.

### Когда купишь домен

Переходи на [Production with a domain (HTTPS)](#production-with-a-domain-https): Caddy, субдомены `app` / `api` / `media`, `docker-compose.prod.yml` вместо `.ip.yml`.

---

## Production with a domain (HTTPS)

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

Generate secrets first:

```bash
openssl rand -hex 32
openssl rand -base64 24
```

**Root `.env`** — example for domain `example.com`:

```env
POSTGRES_DB=scanno
POSTGRES_USER=scanno
POSTGRES_PASSWORD=<random-from-openssl>

MINIO_ROOT_USER=scanno
MINIO_ROOT_PASSWORD=<same-or-another-random>
AWS_STORAGE_BUCKET_NAME=scanno

NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
```

**`backend/.env`** — Django:

```env
DJANGO_SECRET_KEY=<random-from-openssl-rand-hex-32>
DJANGO_DEBUG=0
ALLOWED_HOSTS=api.example.com,localhost,127.0.0.1

DATABASE_URL=postgres://scanno:<POSTGRES_PASSWORD>@db:5432/scanno

CORS_ALLOWED_ORIGINS=https://app.example.com

USE_S3=1
AWS_ACCESS_KEY_ID=scanno
AWS_SECRET_ACCESS_KEY=<MINIO_ROOT_PASSWORD>
AWS_STORAGE_BUCKET_NAME=scanno
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_CUSTOM_DOMAIN=media.example.com/scanno

OPEN_FOOD_FACTS_USER_AGENT=Scanno/1.0 (you@example.com)
```

Same rules as in [Start without a domain](#start-without-a-domain-bare-ip) (шаги 5–6): пароли Postgres/MinIO совпадают между файлами; `DATABASE_URL` использует хост `db`; `CORS_ALLOWED_ORIGINS` — origin фронта без пути.


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
| CORS errors in browser | `CORS_ALLOWED_ORIGINS` missing correct origin (`http://IP:3000` or `https://app...`) |
| Web calls wrong API | Rebuild `web` after changing `NEXT_PUBLIC_API_URL` |
| Broken image URLs | `AWS_S3_CUSTOM_DOMAIN` must match how browsers reach MinIO (`IP:9000/scanno` or `media.domain/scanno`) |
| 502 from Caddy | Stack not up — `docker compose ... ps` and check api/web logs |
| Connection refused on :3000 | Firewall — `ufw allow 3000` (IP mode) or Caddy not running (domain mode) |
| `DisallowedHost` in API | Add your IP or domain to `ALLOWED_HOSTS` in `backend/.env` |
| Out of memory on build | Add swap or use a 4 GB droplet |
