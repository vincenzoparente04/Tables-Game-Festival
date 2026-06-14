-- ============================================================
-- CUTOVER PRODUZIONE: azzera la vecchia app e ricrea lo schema nuovo.
-- Incolla TUTTO nella Neon Console -> SQL Editor ed esegui (un colpo solo).
-- Atomico (BEGIN/COMMIT): se qualcosa fallisce, NIENTE viene modificato.
-- ============================================================

BEGIN;

-- 1) Rimuove tutte le tabelle vecchie (festival FR) e riparte pulito
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO neondb_owner;
GRANT ALL ON SCHEMA public TO public;

-- 2) Registro delle migration (normalmente creato da node-pg-migrate)
CREATE TABLE pgmigrations (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, run_on TIMESTAMP NOT NULL);

-- ===== 1780487748142_init-generic-schema =====
-- =====================================================================
-- Generic, extensible event-platform schema (English).
-- Generic core + optional domain modules + JSONB/custom-field extension.
-- New event types are configured as DATA (event_types/resource_types/
-- pipeline_stages/custom_fields) — no schema migration required.
-- =====================================================================

-- Shared trigger to keep updated_at fresh ------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Auth (carried from Fase 1, English; replaces FR `users` + refresh_tokens)
-- =====================================================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  first_name    VARCHAR(50),
  last_name     VARCHAR(50),
  email         TEXT UNIQUE NOT NULL,
  login         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('admin','super_organizer','organizer','volunteer','visitor','user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- =====================================================================
-- Generic core
-- =====================================================================

-- Event-type templates (config-driven). config JSONB e.g. { "modules": ["games"] }
CREATE TABLE event_types (
  id         SERIAL PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  label      TEXT NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_event_types_updated_at BEFORE UPDATE ON event_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE events (
  id            SERIAL PRIMARY KEY,
  event_type_id INTEGER NOT NULL REFERENCES event_types(id),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE,
  description   TEXT,
  venue         TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  start_date    DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_current    BOOLEAN NOT NULL DEFAULT false,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_events_type ON events(event_type_id);
-- At most one "current" event at a time.
CREATE UNIQUE INDEX uq_events_single_current ON events (is_current) WHERE is_current;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Physical spaces within an event (room, outdoor section, stage zone)
CREATE TABLE areas (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       VARCHAR(150) NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'indoor',
  capacity   INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  layout     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);
CREATE INDEX idx_areas_event ON areas(event_id);
CREATE TRIGGER trg_areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bookable resource categories (table, stand by sqm, seat, slot, ...)
CREATE TABLE resource_types (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  label      TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'unit',
  attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, key)
);
CREATE INDEX idx_resource_types_event ON resource_types(event_id);
CREATE TRIGGER trg_resource_types_updated_at BEFORE UPDATE ON resource_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Inventory: how many units of a type are available, optionally in an area
CREATE TABLE resources (
  id               SERIAL PRIMARY KEY,
  event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  area_id          INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  resource_type_id INTEGER NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
  label            VARCHAR(150),
  total_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  attributes       JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resources_event ON resources(event_id);
CREATE INDEX idx_resources_area ON resources(area_id);
CREATE INDEX idx_resources_type ON resources(resource_type_id);
CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Pricing rules per resource type and/or area
CREATE TABLE pricing_tiers (
  id               SERIAL PRIMARY KEY,
  event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  resource_type_id INTEGER REFERENCES resource_types(id) ON DELETE CASCADE,
  area_id          INTEGER REFERENCES areas(id) ON DELETE CASCADE,
  unit_price       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  price_per_sqm    NUMERIC(10,2) CHECK (price_per_sqm IS NULL OR price_per_sqm >= 0),
  attributes       JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);
CREATE INDEX idx_pricing_tiers_event ON pricing_tiers(event_id);
CREATE TRIGGER trg_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Actors who take part / book (exhibitor, vendor, performer, attendee, ...)
CREATE TABLE participants (
  id               SERIAL PRIMARY KEY,
  event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL DEFAULT 'exhibitor'
                   CHECK (participant_type IN
                     ('exhibitor','vendor','performer','attendee','sponsor','provider','association','other')),
  name             VARCHAR(255) NOT NULL,
  external_ref     TEXT,
  attributes       JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_participants_event ON participants(event_id);
CREATE INDEX idx_participants_type ON participants(participant_type);
CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE participant_contacts (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(255),
  phone          VARCHAR(30),
  role           VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_participant_contacts_participant ON participant_contacts(participant_id);

-- Configurable workflow stages (replaces hardcoded etat_contact CHECK)
CREATE TABLE pipeline_stages (
  id            SERIAL PRIMARY KEY,
  event_type_id INTEGER REFERENCES event_types(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  label         TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  is_terminal   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_type_id, key)
);

CREATE TABLE bookings (
  id                SERIAL PRIMARY KEY,
  event_id          INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id    INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  stage_id          INTEGER REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  attendance_status TEXT NOT NULL DEFAULT 'unset'
                    CHECK (attendance_status IN ('unset','present','presumed_absent','absent')),
  notes             TEXT,
  discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  attributes        JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_id)
);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_participant ON bookings(participant_id);
CREATE INDEX idx_bookings_stage ON bookings(stage_id);
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Resources reserved within a booking
CREATE TABLE booked_resources (
  id               SERIAL PRIMARY KEY,
  booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  resource_type_id INTEGER NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
  area_id          INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  attributes       JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booked_resources_booking ON booked_resources(booking_id);

-- Catalog items presented within a booking (generic; replaces jeux_festival)
CREATE TABLE booking_items (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL,
  item_ref    INTEGER,
  area_id     INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  attributes  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);

CREATE TABLE invoices (
  id             SERIAL PRIMARY KEY,
  booking_id     INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','issued','paid','cancelled')),
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  issued_at      TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ,
  attributes     JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE invoice_lines (
  id          SERIAL PRIMARY KEY,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- Custom field definitions per event type / entity (validate JSONB attributes)
CREATE TABLE custom_fields (
  id            SERIAL PRIMARY KEY,
  event_type_id INTEGER REFERENCES event_types(id) ON DELETE CASCADE,
  entity        TEXT NOT NULL,
  key           TEXT NOT NULL,
  label         TEXT NOT NULL,
  data_type     TEXT NOT NULL DEFAULT 'text'
                CHECK (data_type IN ('text','number','boolean','date','select','multiselect')),
  options       JSONB NOT NULL DEFAULT '[]',
  required      BOOLEAN NOT NULL DEFAULT false,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_type_id, entity, key)
);

-- =====================================================================
-- Optional domain module: "games" (board-game festivals)
-- =====================================================================
CREATE TABLE publishers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_publishers_name ON publishers(name);
CREATE TRIGGER trg_publishers_updated_at BEFORE UPDATE ON publishers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE authors (
  id         SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name  VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE games (
  id               SERIAL PRIMARY KEY,
  publisher_id     INTEGER REFERENCES publishers(id) ON DELETE SET NULL,
  name             VARCHAR(255) NOT NULL,
  category         VARCHAR(100),
  min_age          INTEGER CHECK (min_age IS NULL OR min_age >= 0),
  max_age          INTEGER CHECK (max_age IS NULL OR max_age >= 0),
  min_players      INTEGER CHECK (min_players IS NULL OR min_players >= 1),
  max_players      INTEGER CHECK (max_players IS NULL OR max_players >= COALESCE(min_players, 1)),
  table_size       VARCHAR(20),
  average_duration INTEGER,
  attributes       JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_games_publisher ON games(publisher_id);
CREATE INDEX idx_games_name ON games(name);
CREATE TRIGGER trg_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE game_authors (
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, author_id)
);
INSERT INTO pgmigrations (name, run_on) VALUES ('1780487748142_init-generic-schema', now());

-- ===== 1780487749297_seed-reference-data =====
-- Reference data: event types + their default configurable pipelines.

INSERT INTO event_types (key, label, config) VALUES
  ('festival',       'Festival',         '{"modules": ["games"], "resource_unit": "table"}'),
  ('fair',           'Fair',             '{"modules": [], "resource_unit": "stand"}'),
  ('concert',        'Concert',          '{"modules": [], "resource_unit": "seat"}'),
  ('conference',     'Conference',       '{"modules": [], "resource_unit": "seat"}'),
  ('dinner',         'Seated dinner',    '{"modules": [], "resource_unit": "seat"}'),
  ('art_exhibition', 'Art exhibition',   '{"modules": [], "resource_unit": "sqm"}'),
  ('sports',         'Sports tournament','{"modules": [], "resource_unit": "court"}'),
  ('party',          'Party / nightlife','{"modules": [], "resource_unit": "table"}');

-- Commercial outreach pipeline for festivals (invoiced/paid are derived from
-- the invoice, not pipeline stages).
INSERT INTO pipeline_stages (event_type_id, key, label, position, is_terminal)
SELECT et.id, s.key, s.label, s.position, s.is_terminal
FROM event_types et
CROSS JOIN (VALUES
  ('not_contacted', 'Not contacted', 0, false),
  ('contacted',     'Contacted',     1, false),
  ('in_discussion', 'In discussion', 2, false),
  ('reserved',      'Reserved',      3, false),
  ('confirmed',     'Confirmed',     4, false),
  ('cancelled',     'Cancelled',     5, true)
) AS s(key, label, position, is_terminal)
WHERE et.key = 'festival';

-- Generic default pipeline for the other event types
INSERT INTO pipeline_stages (event_type_id, key, label, position, is_terminal)
SELECT et.id, s.key, s.label, s.position, s.is_terminal
FROM event_types et
CROSS JOIN (VALUES
  ('pending',   'Pending',   0, false),
  ('confirmed', 'Confirmed', 1, false),
  ('cancelled', 'Cancelled', 2, true)
) AS s(key, label, position, is_terminal)
WHERE et.key IN ('fair', 'concert', 'conference', 'dinner', 'art_exhibition', 'sports', 'party');
INSERT INTO pgmigrations (name, run_on) VALUES ('1780487749297_seed-reference-data', now());

-- ===== 1781246463831_extend-events-and-bookings =====
-- Events: public lifecycle (draft/published/archived), featured highlight,
-- hero image, presentation fields, overall capacity and daily times.
ALTER TABLE events
  ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN hero_image_url TEXT,
  ADD COLUMN subtitle VARCHAR(255),
  ADD COLUMN location_address TEXT,
  ADD COLUMN capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  ADD COLUMN start_time TIME,
  ADD COLUMN end_time TIME;

-- At most one featured event at a time (the public homepage highlight).
CREATE UNIQUE INDEX uq_events_single_featured ON events (is_featured) WHERE is_featured;

-- Bookings become generic "agreements": exhibitor stands, artist engagements,
-- vendor/supplier contracts, sponsorships. A participant may legitimately hold
-- several agreements per event (e.g. two vendor contracts), so the hard
-- uniqueness goes away; duplicates surface as service-level warnings instead.
ALTER TABLE bookings
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'exhibitor'
    CHECK (kind IN ('exhibitor','artist','vendor','sponsor','other'));
ALTER TABLE bookings DROP CONSTRAINT bookings_event_id_participant_id_key;
CREATE INDEX idx_bookings_kind ON bookings(kind);
INSERT INTO pgmigrations (name, run_on) VALUES ('1781246463831_extend-events-and-bookings', now());

-- ===== 1781246463957_create-artists-module =====
-- Optional domain module: "artists" (exhibitions, concerts, performances).
-- Global catalog (like publishers/games) + per-event lineup join.
CREATE TABLE artists (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  -- musician/band/dj/painter/... — validated in the API, extensible without migration
  kind       TEXT NOT NULL DEFAULT 'musician',
  bio        TEXT,
  image_url  TEXT,
  links      JSONB NOT NULL DEFAULT '{}', -- { "website": ..., "instagram": ..., "spotify": ... }
  attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_artists_kind ON artists(kind);
CREATE TRIGGER trg_artists_updated_at BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Public lineup of an event; optionally tied to the engagement agreement (booking).
CREATE TABLE event_artists (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id     INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  booking_id    INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  is_headliner  BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, artist_id)
);
CREATE INDEX idx_event_artists_event ON event_artists(event_id);
INSERT INTO pgmigrations (name, run_on) VALUES ('1781246463957_create-artists-module', now());

-- ===== 1781246464081_create-schedule-slots =====
-- Event programme: performances/exhibitions/talks with times and a location.
-- Slots reference areas (stable) — never map elements (those are bulk-replaced
-- on every map save, so their ids churn by design).
CREATE TABLE schedule_slots (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  area_id    INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  artist_id  INTEGER REFERENCES artists(id) ON DELETE SET NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  title      VARCHAR(255) NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'performance'
             CHECK (kind IN ('performance','exhibition','talk','workshop','screening','other')),
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'confirmed'
             CHECK (status IN ('tentative','confirmed','cancelled')),
  is_public  BOOLEAN NOT NULL DEFAULT true,
  attributes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_schedule_slots_event_time ON schedule_slots(event_id, starts_at);
CREATE TRIGGER trg_schedule_slots_updated_at BEFORE UPDATE ON schedule_slots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
INSERT INTO pgmigrations (name, run_on) VALUES ('1781246464081_create-schedule-slots', now());

-- ===== 1781246464236_create-expenses-and-event-images =====
-- Money OUT: payments due under supplier/artist agreements (booking_id set)
-- and self-managed purchases (booking_id NULL, e.g. running your own bar).
-- Money IN stays in invoices (participant pays the organizer).
CREATE TABLE expenses (
  id                   SERIAL PRIMARY KEY,
  event_id             INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booking_id           INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  participant_id       INTEGER REFERENCES participants(id) ON DELETE SET NULL,
  category             TEXT NOT NULL DEFAULT 'other', -- free-form key; suggested values in the UI
  description          VARCHAR(500) NOT NULL,
  amount               NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status               TEXT NOT NULL DEFAULT 'planned'
                       CHECK (status IN ('planned','committed','paid')),
  due_date             DATE,
  paid_at              TIMESTAMPTZ,
  supplier_invoice_ref VARCHAR(100),
  attachment_url       TEXT,
  attributes           JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_event ON expenses(event_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Gallery/poster images per event (the hero lives on events.hero_image_url).
CREATE TABLE event_images (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  public_id  TEXT, -- Cloudinary id, kept for best-effort deletion
  kind       TEXT NOT NULL DEFAULT 'gallery' CHECK (kind IN ('gallery','poster')),
  position   INTEGER NOT NULL DEFAULT 0,
  alt        VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_images_event ON event_images(event_id);
INSERT INTO pgmigrations (name, run_on) VALUES ('1781246464236_create-expenses-and-event-images', now());

-- ===== 1781290603102_create-venue-maps =====
-- Drag&drop venue maps. A map belongs to an event (multiple maps allowed,
-- e.g. outdoor grounds + indoor pavilion). The decorative background comes
-- from a venue template (copied at creation, never shared). Elements are
-- proper rows so links keep FK integrity and capacity aggregates stay in SQL;
-- saving replaces all elements of a map in one transaction (ids churn by
-- design — nothing else references element ids).
CREATE TABLE venue_maps (
  id           SERIAL PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name         VARCHAR(150) NOT NULL,
  template_key TEXT, -- provenance only; template content is copied into background
  width        REAL NOT NULL DEFAULT 1200 CHECK (width > 0),
  height       REAL NOT NULL DEFAULT 800 CHECK (height > 0),
  background   JSONB NOT NULL DEFAULT '[]', -- decorative shapes (lawns, paths, walls, ...)
  settings     JSONB NOT NULL DEFAULT '{}', -- grid size, snap, background color, ...
  is_public    BOOLEAN NOT NULL DEFAULT true, -- shown on the public event page
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);
CREATE INDEX idx_venue_maps_event ON venue_maps(event_id);
CREATE TRIGGER trg_venue_maps_updated_at BEFORE UPDATE ON venue_maps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE map_elements (
  id           SERIAL PRIMARY KEY,
  venue_map_id INTEGER NOT NULL REFERENCES venue_maps(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN
               ('stage','stand','table','booth','bar','food','entrance','exit','wc','seating','info','decor','custom')),
  label        VARCHAR(150), -- e.g. "Stand of Acme", "Main Stage"
  x            REAL NOT NULL DEFAULT 0,
  y            REAL NOT NULL DEFAULT 0,
  width        REAL NOT NULL DEFAULT 80 CHECK (width > 0),
  height       REAL NOT NULL DEFAULT 60 CHECK (height > 0),
  rotation     REAL NOT NULL DEFAULT 0,
  capacity     INTEGER CHECK (capacity IS NULL OR capacity >= 0), -- guests this element holds
  color        VARCHAR(20),
  z_index      INTEGER NOT NULL DEFAULT 0,
  area_id      INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  resource_id  INTEGER REFERENCES resources(id) ON DELETE SET NULL,
  booking_id   INTEGER REFERENCES bookings(id) ON DELETE SET NULL, -- "stand of X"
  attributes   JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_map_elements_map ON map_elements(venue_map_id);
INSERT INTO pgmigrations (name, run_on) VALUES ('1781290603102_create-venue-maps', now());

-- ===== 1781292930577_create-ticketing =====
-- Visitor ticketing: ticket tiers per event (free or paid, limited or open),
-- guest-checkout orders (no account needed; the order code is the bearer
-- secret) and individual QR-coded tickets.
CREATE TABLE ticket_types (
  id             SERIAL PRIMARY KEY,
  event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           VARCHAR(150) NOT NULL,
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0), -- 0 = free
  currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  capacity       INTEGER CHECK (capacity IS NULL OR capacity >= 0), -- NULL = unlimited
  sales_start_at TIMESTAMPTZ,
  sales_end_at   TIMESTAMPTZ,
  max_per_order  INTEGER NOT NULL DEFAULT 10 CHECK (max_per_order > 0),
  status         TEXT NOT NULL DEFAULT 'on_sale' CHECK (status IN ('hidden','on_sale','paused')),
  position       INTEGER NOT NULL DEFAULT 0,
  attributes     JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, name),
  CHECK (sales_end_at IS NULL OR sales_start_at IS NULL OR sales_end_at > sales_start_at)
);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
CREATE TRIGGER trg_ticket_types_updated_at BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  event_id         INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code             VARCHAR(20) NOT NULL UNIQUE, -- short crypto-random; acts as the lookup secret
  customer_name    VARCHAR(150) NOT NULL,
  customer_email   VARCHAR(255) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled','expired','refunded')),
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency         VARCHAR(3) NOT NULL DEFAULT 'EUR',
  payment_provider TEXT NOT NULL DEFAULT 'none' CHECK (payment_provider IN ('none','stripe')),
  payment_ref      TEXT, -- Stripe Checkout session id
  expires_at       TIMESTAMPTZ, -- pending orders hold capacity until this moment
  confirmed_at     TIMESTAMPTZ,
  attributes       JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_ref ON orders(payment_ref);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE tickets (
  id             SERIAL PRIMARY KEY,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- RESTRICT: a tier with sold tickets cannot vanish (service raises a friendly 409)
  ticket_type_id INTEGER NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  code           VARCHAR(20) NOT NULL UNIQUE, -- printed/QR-encoded check-in code
  attendee_name  VARCHAR(150),
  status         TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','checked_in','cancelled')),
  checked_in_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_order ON tickets(order_id);
CREATE INDEX idx_tickets_type ON tickets(ticket_type_id);
INSERT INTO pgmigrations (name, run_on) VALUES ('1781292930577_create-ticketing', now());

COMMIT;
