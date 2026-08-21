# Scanno mobile (Expo)

Barcode scanner client for the Scanno API.

## Setup

```bash
cd mobile
npm install
```

Set API URL for a physical device (use your machine LAN IP, not localhost):

```bash
# app.json extra.apiUrl or:
set EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api/v1
```

```bash
npx expo start
```

## Features (phase 5)

- Login against Django JWT API
- Camera barcode scan (EAN/UPC)
- Manual barcode entry
- Product detail with aggregate rating / never-again %

Writing reviews is on the web MVP; extend this app later with the same `/products/{id}/reviews/` endpoints.
