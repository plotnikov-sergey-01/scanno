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

## Production checklist

1. Set strong `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, real `ALLOWED_HOSTS`.
2. Use managed PostgreSQL and S3/R2 (`USE_S3=1`).
3. Serve API behind HTTPS (Caddy/Nginx) with gunicorn:
   `gunicorn config.wsgi:application -b 0.0.0.0:8000`
4. Deploy `web` with `npm run build && npm start` or Vercel; set `NEXT_PUBLIC_API_URL` to the public API.
5. Optionally set `NEXT_PUBLIC_POSTHOG_KEY` for product analytics.
6. Create a real superuser; disable/change seed passwords.

## First users

- Invite friends to scan 10 products they already regret buying.
- Seed popular local SKUs via barcode lookup.
- Share PWA “Add to Home Screen” for aisle use before native apps ship.
