# Scanno / Rebuyly — product backlog

Living backlog for MVP and next phases. Source of truth for humans; Trello import: [`trello-scanno-mvp.json`](./trello-scanno-mvp.json).

**Product model today:** content = **Review on Product** (not free-form posts). One review per user per product. See [`PRODUCT_IDENTITY.md`](./PRODUCT_IDENTITY.md).

## Already shipped (do not re-build)

| Area | Status |
|------|--------|
| Auth (JWT, email) | Done |
| Product search, barcode lookup, OFF import, manual create | Done |
| Review CRUD, verdict, rating, price, review photos + crop | Done |
| Explore feeds (global, not friends) | Done |
| Diary, public profiles | Done |
| Comments API | Done — **UI missing** |
| Reports API | Done — **UI missing** |
| Mobile: login, scan, product view | Done — **no review form** |
| Production deploy | Not done |

---

## Sprint 1 (recommended order)

1. Deploy staging (DO + HTTPS)
2. Comments UI on product page
3. Follow model + following feed
4. Profile settings (bio, avatar)
5. Mobile: write/edit review

---

## Import into Trello

Trello **does not** natively import JSON on any plan (including Premium). Options:

| Method | Premium needed? |
|--------|-----------------|
| **Power-Up** e.g. “JSON Import for Trello”, “Import to Board (JSON)” | Trello Premium **not** required; some Power-Ups have their own free tier / paid tier |
| **Copy-paste** — one card title per line into a list | Free |
| **Trello REST API** — script reads `trello-scanno-mvp.json` | Free (API key + token) |
| Native “Import JSON” in Trello menu | **Does not exist** |

Steps (Power-Up, typical):

1. Create empty board on [trello.com](https://trello.com).
2. Board → **Power-Ups** → search **JSON import** → enable one importer.
3. Upload `docs/trello-scanno-mvp.json` (or paste JSON if the Power-Up asks for Trello export format — our file includes `trelloExport` for that).

CSV: Trello Premium allows **export** to CSV, not import back. No need for Premium for this backlog.

---

## Lists (mirror of JSON)

### MVP — доделать

- Comments UI on reviews
- Report review/comment UI
- Edit user-product description on product page
- Profile settings page
- Web barcode camera scan on `/search`
- Review photo gallery block on product page

### Deploy & staging

- Staging on DigitalOcean (Docker + Caddy)
- Production env checklist
- GitHub Actions CI (backend + web build)
- OFF seed on staging
- Deploy runbook update

### Social v1

- ADR: Follow vs Friend
- Follow / Unfollow API
- Following feed (`GET /feed/`)
- Follow button + counts on profile
- In-app notifications (minimal)
- Explore tabs: Global / Following

### Mobile

- Review form on product screen
- Review photo upload
- Polish auth errors
- EAS / local build docs + TestFlight path

### Later (post-MVP)

- Nutrition / E-numbers / country bans
- Price compare & affiliates
- Push notifications
- Review version history
- Admin product merge UI
- Brand rename (Rebuyly)
- Optional: standalone Post entity, review video

---

## Cursor context for devs

Read [`../AGENTS.md`](../AGENTS.md), [`ONBOARDING.md`](./ONBOARDING.md), [`PRODUCT_IDENTITY.md`](./PRODUCT_IDENTITY.md).
