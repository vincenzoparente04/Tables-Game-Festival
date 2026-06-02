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
npx tsc --noEmit       # typecheck (passes today)
# TODO (add in Fase 1): npm run build | typecheck | lint | test | migrate
```
Requires env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `REFRESH_EXPIRATION`,
`FRONTEND_URL`, `PORT`, `NODE_ENV`. Local certs live in `backend/certs/*.pem` (gitignored).

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
  backups in tags `backup/pre-refactor-deploy`, `archive/*`.
- **Fase 1 — Security hardening** 🚧 in progress. Remove default admin/admin, separate access/refresh
  tokens, rate limiting, fix RBAC enforcement, central error handler, zod validation, ESLint/Prettier,
  test scaffold, dependency audit (`npm audit`: 2 high + 2 moderate to resolve).
- **Fase 2 — i18n EN + schema redesign + generalization** (combined; no production data → clean redesign).

## Git
- `main` = single source of truth & integration branch. `deploy` tracks releases (kept aligned with main).
- Feature branches off `main`. End commit messages with the Co-Authored-By trailer.
- Full pre-refactor backup: tag `backup/pre-refactor-deploy`.
