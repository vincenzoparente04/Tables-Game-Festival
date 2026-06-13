# Event Platform — exhibitions, art events & concerts

A full-stack platform for organizing events held in physical spaces: art exhibitions,
festivals, concerts, fairs. One tool for the whole job — from the first artist agreement
to the venue map, the public event page and the tickets scanned at the door.

> The project started as a board-game festival manager (academic team project) and was
> refactored into a generic, sellable event platform. The history and the phase-by-phase
> roadmap live in [CLAUDE.md](CLAUDE.md).

## What it does

**For organizers** (staff area under `/admin`):
- **Events** — draft → published lifecycle, auto-generated public URL, hero image &
  gallery (Cloudinary), capacity, daily times, one *featured* event for the homepage.
- **Artists** — global catalog (musicians, painters, DJs, collectives…) with photos and
  links; per-event lineup with headliners and billing order.
- **Agreements** — every deal is a booking with a `kind`: exhibitors renting stands,
  artists engaged to perform, vendors/suppliers under contract, sponsors. Pipeline
  stages are configurable data; duplicate open agreements are flagged, never blocked.
- **Schedule** — per-day programme with stage/area assignment and overlap warnings
  (same stage or same artist at the same time).
- **Venue maps** — drag & drop SVG editor with 12 location templates (park, stadium,
  club, fair pavilion, gallery, theater…). Place stages, stands, bars, food, services;
  link elements to agreements/resources; live guest-capacity totals; undo/redo.
- **Money** — invoices for money IN (exhibitor fees), expenses for money OUT (artist
  fees, security, rentals, self-managed bar supplies…), and a finance dashboard with
  projected/cash net and per-category breakdown.
- **Tickets** — free or paid tiers, limited or unlimited capacity, sales windows;
  orders list and door check-in by QR/ticket code (volunteers allowed).
- **Poster builder** — three SVG layouts pre-filled from the event, exported as
  print-ready PNG or saved into the gallery.

**For visitors** (public site at `/`):
- Dark, bold showcase: featured hero, upcoming & past events.
- Event pages with lineup, day-by-day programme, interactive venue map (pan/zoom,
  tap elements), photo gallery and a sticky ticket widget.
- Guest checkout — no account needed. Free orders confirm instantly; paid orders go
  through Stripe Checkout. Tickets arrive by email with QR codes, and the order page
  (`/orders/<code>`) shows them any time.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node + Express 5, TypeScript (ESM via `tsx`), PostgreSQL (`pg`, no ORM), node-pg-migrate |
| Frontend | Angular 20 (standalone components + signals), custom CSS design system |
| Auth | JWT access+refresh in httpOnly cookies, rotating refresh tokens, RBAC matrix |
| Payments | Stripe Checkout + signed webhook (optional — free events work without keys) |
| Media | Cloudinary (optional — uploads return 503 until configured) |
| Email | console (default) / SMTP / Resend |
| Deploy | Render (API) + Netlify (frontend); local dev over HTTPS via mkcert |

## Getting started

```bash
# 1. Postgres (Docker)
docker compose -f docker-compose.dev.yml up -d db

# 2. Backend
cd backend
cp .env.example .env          # fill in at least DATABASE_URL, JWT_SECRET, ADMIN_*
npm install
npm run migrate               # versioned schema
npm run seed:demo             # optional: 6 published demo events with everything
npm run dev                   # https://localhost:4000 (mkcert certs in ./certs)

# 3. Frontend
cd ../frontend
npm install
npm start                     # https://localhost:4200 (proxies /api to the backend)
```

Sign in at `/login` with the `ADMIN_LOGIN`/`ADMIN_PASSWORD` from your `.env`.
The public site is the root URL; the staff area lives under `/admin`.

### Environment variables (backend)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRATION`, `REFRESH_EXPIRATION` | ✅ | Token signing & lifetimes |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` | ✅ | Admin bootstrap on startup |
| `FRONTEND_URL` | ✅ | CORS origin + links in emails/Stripe redirects |
| `PORT`, `NODE_ENV` | ✅ | Server config |
| `CLOUDINARY_URL` | optional | Image uploads (503 until set) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional | Paid tickets (503 until set; free tickets always work) |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_URL`, `RESEND_API_KEY` | optional | Order emails (`console` by default) |

### Stripe setup

1. Set `STRIPE_SECRET_KEY` (test mode: `sk_test_…`).
2. Register a webhook pointing to `https://<api-host>/api/stripe/webhook` for
   `checkout.session.completed` and `checkout.session.expired`; set its signing
   secret as `STRIPE_WEBHOOK_SECRET`.
3. Local development: `stripe listen --forward-to localhost:4000/api/stripe/webhook`.

The order page also actively verifies the session (`verify-payment`) after the
redirect, so a slow webhook never strands a buyer.

## Commands

```bash
# backend/
npm run dev | start | build | typecheck | lint | format
npm test                # vitest unit suites (no DB needed)
npm run test:db         # full suite against a throwaway Postgres container
npm run migrate         # node-pg-migrate up
npm run seed:demo       # wipe business data + seed a rich demo dataset
npm run admin:rotate    # rotate the admin password

# frontend/
npm start | npm run build | npm test
```

## Architecture notes

- **Route → service → repository** layering; parameterized SQL everywhere; whitelisted
  UPDATE columns; transactions for every multi-row invariant (invoices, map bulk
  replace, order+tickets with `FOR UPDATE` capacity locking).
- **Generic core, pluggable domains**: events/areas/resources/participants/bookings/
  invoices are domain-agnostic; "artists" and "games" are optional modules; event types
  and pipeline stages are data, not schema.
- **Single-organization deployment** by design, with clean seams for multi-tenancy
  later (every table keys off `event_id`; catalogs are global).
- **Public API is a projection**: only published events are exposed; map elements are
  served with display labels resolved server-side and no internal ids.
- Backlog (documented, not built): SSR/SEO rendering, multi-organization mode,
  refunds, volunteer check-in PWA.

## License / status

Private project — pre-production. Production deploy still runs the legacy Fase 1
build; the BE+FE cutover to this codebase is the next deployment milestone
(see the roadmap in [CLAUDE.md](CLAUDE.md)).
