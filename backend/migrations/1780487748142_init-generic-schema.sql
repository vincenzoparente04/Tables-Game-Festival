-- Up Migration
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

-- Down Migration
DROP TABLE IF EXISTS game_authors;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS custom_fields;
DROP TABLE IF EXISTS invoice_lines;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS booking_items;
DROP TABLE IF EXISTS booked_resources;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS pipeline_stages;
DROP TABLE IF EXISTS participant_contacts;
DROP TABLE IF EXISTS participants;
DROP TABLE IF EXISTS pricing_tiers;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS resource_types;
DROP TABLE IF EXISTS areas;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS event_types;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP FUNCTION IF EXISTS set_updated_at();
