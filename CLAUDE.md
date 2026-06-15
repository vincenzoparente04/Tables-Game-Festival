# CLAUDE.md — Event Platform (ex Game Festival App)

> Guida per Claude Code e per gli sviluppatori durante il mega-refactoring.
> Stato: **in migrazione** da "festival di giochi da tavolo" (verticale, francese) a
> **piattaforma SaaS generica per eventi in sale/tavoli, interamente in inglese**.

## Project
Full-stack TypeScript app for managing events held in rooms with tables/resources
(board-game festivals today; fairs, tournaments, conferences, seated dinners tomorrow).

- **Backend:** Node + Express 5, TypeScript (ESM, run via `tsx`), PostgreSQL via `pg` (raw, no ORM).
- **Frontend:** Angular 20 + Angular Material. *(Out of scope for now — visual/design handled later.)*
- **Auth:** JWT (access + refresh) in httpOnly cookies, bcryptjs, RBAC permission matrix.
- **Deploy:** Render (backend, HTTP behind platform TLS) + Netlify (frontend). Local dev = HTTPS via mkcert.

## Commands

### Backend (`/backend`)
```bash
npm install            # install deps (package-lock.json is source of truth)
npm run dev            # tsx watch src/server.ts  — local HTTPS via ./certs (mkcert)
npm start              # tsx src/server.ts        — production (NODE_ENV=production, HTTP)
npm run build          # tsc -> dist/  (production runs `node dist/server.js`)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .  (Prettier via npm run format)
npm test               # vitest run
npm run migrate        # node-pg-migrate up  (DB schema; needs DATABASE_URL)
npm run admin:rotate   # rotate the admin password (ADMIN_LOGIN/ADMIN_PASSWORD env)
```
Requires env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `REFRESH_EXPIRATION`,
`FRONTEND_URL`, `PORT`, `NODE_ENV`, and `ADMIN_LOGIN`/`ADMIN_PASSWORD`/`ADMIN_EMAIL`
(admin bootstrap — see `.env.example`). Local certs live in `backend/certs/*.pem` (gitignored).
DB schema is managed by versioned migrations in `backend/migrations/` (no business data →
reset & re-migrate on a clean DB). Local Postgres for testing: `docker compose -f docker-compose.dev.yml up -d db`.

### Frontend (`/frontend`)
```bash
npm install
npm start              # ng serve
npm run build          # ng build
npm test               # ng test (karma/jasmine)
```

## Conventions (refactor rules)
- **English only**: code, comments, identifiers, DB tables/columns/enum values, API paths, logs, errors.
- **No `any`**: prefer precise types; centralize error handling instead of `catch (error: any)`.
- **Parameterized SQL always** (`$1,$2…`) — never string-interpolate user input. *(Already respected.)*
- **No secrets in repo**: env vars only. `*.pem`, `*.key`, `cookies.txt`, `*.sql` backups, `.env` are gitignored.
- **RBAC**: every protected route must declare the correct `requirePermission(resource, action)`
  for **its own** resource (a past bug used `'festivals'` perms on `/jeux` routes — never copy-paste perms).
- **`tsconfig` stays strict** (already strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`…) — do not loosen.
- **DB changes go through versioned migrations** (tool TBD), never manual `.sql` edits applied by hand.
- **node_modules / dist are never committed.** ⚠️ When untracking already-tracked files, beware:
  `git rm --cached` + later checkout/merge of a branch that still tracks them will *delete them from disk*.

## Architecture (target)
- **Generic core:** `events` / `resources` / `areas` / `pricing_tiers` / `participants` / `bookings` / `invoices`.
- **Domain specifics** (games, publishers, authors, players/age) = **pluggable module**, not core.
- **Configurable pipeline:** workflow states (`etat_contact`…) become data, not hardcoded `CHECK` constraints.
- **Service/repository layer** between routes and DB — no inline SQL in route handlers.

### Current → target naming (i18n + generalization)
| Today (FR, vertical) | Target (EN, generic) |
|---|---|
| festivals | events (+ event_type) |
| table / espace_tables / chairs | resources (+ resource_type) |
| zones_plan | areas / spaces |
| zones_tarifaires | pricing_tiers |
| reservants | participants / exhibitors |
| reservations (+ reservations_zones) | bookings (+ booked_resources) |
| jeux / editeurs / auteurs | pluggable "games" module |
| factures | invoices |
| roles: organisateur/benevole/visiteur | organizer / volunteer / visitor |

## Refactor roadmap
- **Fase 0 — Git cleanup** ✅ done. `main` = single source of truth, linear; obsolete branches pruned;
  backups in tags `backup/pre-refactor-deploy`, `backup/pre-fase1-deploy`, `archive/*`.
- **Fase 1 — Security hardening** ✅ done & deployed (live on Render). admin from env, access/refresh
  token `type` claim, revocable+rotating refresh tokens, rate limiting, helmet, zod, central error
  handler, ESLint/Prettier, vitest+supertest, 0 npm audit vulns.
- **Fase 2 — Generic English schema + backend** ✅ done.
  - **2.A ✅** generic extensible schema via node-pg-migrate (events/areas/resource_types/resources/
    pricing_tiers/participants/bookings/booked_resources/booking_items/invoices/custom_fields +
    optional `games` module; JSONB attributes; event types & pipelines as data).
  - **2.B ✅** backend rebuilt on the generic schema: route → service → repository layers, English
    REST API (`/api/events|areas|resource-types|resources|pricing-tiers|participants|bookings|invoices|publishers|authors|games|users`),
    pricing/invoicing in the service layer. Legacy FR routes removed.
  - **2.C ✅** vitest unit + DB integration suite (`npm run test:db`). **2.D ✅** Angular admin MVP
    (branch `feat/frontend-redesign`): design system, events/participants/resources/bookings/
    invoices/games/users modules, shared event context/selector.
  - **✅ Deployed** (cutover June 2026): prod now runs the full arts platform from `main`
    (Render backend + Netlify frontend + Neon DB); the old Fase-1 prod is gone.
- **Fase D→H — Specialization: art events, exhibitions & concerts** ✅ done & deployed.
  Decisions: single-organization deployment (multi-tenant-ready seams), Stripe Checkout for
  tickets, Cloudinary for media. Public site at `/`, admin moves under `/admin` (lazy).
  - **D1 ✅** (branch `feat/d1-domain-foundation`) backend domain foundation: artists module
    (global catalog + `event_artists` lineup), `schedule_slots` with overlap warnings,
    `expenses` + event finance overview (`GET /api/events/:id/finance`), Cloudinary uploads +
    `event_images`, bookings as generic agreements (`kind`, duplicate warnings, uniqueness
    dropped), event publishing (status/auto-slug/featured/hero/capacity/times; public routes
    filter `status='published'`).
  - **D2 ✅** (branch `feat/d2-venue-maps`) venue maps backend: `venue_maps` (multiple per event)
    + `map_elements` rows (FK links to areas/resources/bookings with ON DELETE SET NULL),
    bulk-replace endpoint `PUT /api/venue-maps/:id/elements` (transactional, ≤500 elements),
    capacity summary per kind, 12 venue templates as TS data (`services/venue-templates.ts`),
    `GET /api/venue-templates`.
  - **D3 ✅** (branch `feat/d3-ticketing`) ticketing backend: `ticket_types` (free/paid tiers,
    capacity NULL=unlimited, sales windows) / `orders` (guest checkout, crypto-random code as
    bearer secret, pending holds capacity 35min w/ lazy expiry sweep) / `tickets` (QR codes,
    check-in incl. volunteers); FOR-UPDATE capacity transaction (event row then tiers in id
    order); public endpoints `/api/public/events/:slug/ticket-types`, `POST/GET /api/public/
    orders` (rate-limited); Stripe Checkout via `payments.service` (503 without keys, prices
    always from DB) + webhook `/api/stripe/webhook` (express.raw mounted BEFORE express.json,
    idempotent confirm/expire); `email.service` console/smtp/resend + QR confirmation template.
  - **E0 ✅** (branch `feat/e0-frontend-shell`) frontend restructure: bare root `App`, staff shell
    moved to `admin/admin-layout.ts`, lazy routes under `/admin/*` (`admin/admin.routes.ts`,
    per-page chunks), public site owns the root + wildcard (`public/public.routes.ts`),
    `/showcase` → `/`, route titles, pending users land on the public home.
  - **E1–E4 ✅** (branch `feat/e-admin-ux`) admin UX: artists catalog + lineup panel (E1);
    agreements kind tabs + expenses page + finance dashboard (E2); schedule editor with day
    tabs/per-area grouping/conflict banners (E3); event publishing & media panels + tickets &
    orders page with door check-in (E4). All new Api services/models in `core/`.
  - **F ✅** (branch `feat/f-map-editor`) custom SVG map editor: shared `map-canvas` renderer
    (viewBox pan/zoom, pointer move/resize, snap-to-grid; reused read-only by the public site),
    `MapState` with snapshot undo/redo, palette of 13 element kinds, properties panel with
    booking/resource/area links, capacity ticker, template gallery on map creation, bulk save,
    keyboard shortcuts (arrows/Del/Ctrl+Z/D), beforeunload guard.
  - **G ✅** (branch `feat/g-public-site`) public visitor site: dark bold theme (`.public-shell`
    scope, Sora font), home with featured hero + upcoming/past, event page (lineup, programme by
    day, read-only interactive map via shared `map-canvas` with public-safe projection, gallery
    + lightbox, sticky ticket widget with inline guest checkout), order page with client-side
    QR codes and post-Stripe polling; public API exposes lineup/images/schedule/map (labels
    resolved server-side, internal ids hidden). Legacy showcase removed.
  - **G2 ✅** Stripe end-to-end: `POST /api/public/orders/:code/verify-payment` (active session
    check via Stripe API, idempotent, 503 without keys), order page polls verify+reload after
    the Checkout redirect. Ops: set STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET on Render, register
    the webhook for checkout.session.completed|expired, use `stripe listen` locally.
  - **H ✅** (branch `feat/h-poster-seed-docs`) poster builder (`/admin/posters`: 3 SVG layouts
    prefilled from event+lineup, PNG export at 2x, save-to-gallery), demo seed rebuilt for the
    arts domain (6 published events with lineup/schedule/maps/tickets/orders/expenses, 1
    featured), README rewritten for the product. Fixed latent REAL-vs-int parameter inference
    in map-element inserts (`COALESCE($n::real, …)`) + regression test.
    (SSR, multi-org, refunds, volunteer check-in PWA: documented backlog.)
- **Fase I — Dark restyle + prod go-live** ✅ done & deployed (branch `feat/i-restyle-dark`,
  merged to `main`). Dark design tokens (electric blue/violet, Space Grotesk + JetBrains Mono),
  public-site motion + inline SVG icon set (emoji dropped), curated map glyphs, admin dark
  coherence, light/dark pill toggle, magnetized login button, semantic status color scales.
  Games admin section removed (model game tables as resources; the backend games API stays,
  staff-only). Bugfixes: transactional event delete (tickets-first), surfaced create/delete
  errors. `scripts/seed-prod-api.ts` (`npm run seed:prod-api`) seeds a live deployment over the
  REST API (admin login + POST) — used because Neon isn't reachable directly from dev machines;
  prod populated with 6 demo events. Stripe test mode live on prod.

## Git
- `main` = single source of truth & integration branch. **Prod auto-deploys from `main`**
  (Render backend + Netlify frontend); the legacy `deploy` branch is abandoned (frozen
  pre-arts-buildout — ignore it).
- Feature branches off `main`. End commit messages with the Co-Authored-By trailer.
- Full pre-refactor backup: tag `backup/pre-refactor-deploy`.
