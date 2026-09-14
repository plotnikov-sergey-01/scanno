# Social authentication

The API uses django-allauth and dj-rest-auth for provider validation, social
account storage, provider token exchange, and JWT issuance. The frontend opens
the provider popup and receives the authorization code; Django exchanges that
code using the provider secret stored in the backend Social Application.

## API

Send a POST with the authorization code and the exact redirect URI used by the
provider popup:

```json
{
  "code": "<provider authorization code>",
  "redirect_uri": "https://example.com/auth/social/callback?provider=google"
}
```

Use one of:

- `/api/v1/auth/social/google/`
- `/api/v1/auth/social/facebook/`
- `/api/v1/auth/social/linkedin/`

Successful responses contain `access`, `refresh`, and `user`. These routes are
included in the generated OpenAPI schema at `/api/schema/`.
The old `/api/v1/auth/social/` endpoint has been removed. Email registration,
email login, refresh, and profile routes remain in `accounts.urls`.

## Configuration and restart

Create Social Applications in Django admin, associate them with the configured
Site (`SITE_ID = 1`), and enter the provider credentials there. Provider
secrets live only in Django admin/allauth storage, never in frontend env vars.

Frontend public client IDs remain in `web/.env.example`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_FACEBOOK_APP_ID=
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=
```

For production Docker builds, these `NEXT_PUBLIC_*` values must be available as
build args because Next.js inlines them during `npm run build`.

The backend accepts social callback redirects only from
`SOCIAL_AUTH_ALLOWED_REDIRECT_ORIGINS`. For local development this should include:

```env
SOCIAL_AUTH_ALLOWED_REDIRECT_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For HTTPS production use the public web origin:

```env
SOCIAL_AUTH_ALLOWED_REDIRECT_ORIGINS=https://example.com
```

Provider redirect URLs must match the frontend callback URL exactly, including
the `provider` query parameter. Examples:

```text
http://localhost:3000/auth/social/callback?provider=google
https://example.com/auth/social/callback?provider=google
```

After dependency changes, rebuild the containers:

```bash
docker compose up --build -d
```

The API startup command runs migrations automatically. Migration
`accounts.0003_move_social_accounts_to_allauth` transfers existing provider links
to allauth before removing the old table. It keeps user ownership, email, and
timestamps, and maps `linkedin` to allauth's `linkedin_oauth2` provider ID.
Conflicting owners stop the migration instead of silently reassigning accounts.
Keep `0002_socialaccount.py` as migration history for existing databases.

## Verification limits

Local tests check routing, redirect origin validation, and data migration without
contacting social providers. A real login still requires configured provider
applications, matching callback URLs, and HTTPS for public production domains.
LinkedIn uses allauth's `linkedin_oauth2` adapter, so the frontend requests the
matching legacy scopes: `r_liteprofile r_emailaddress`.
