-- Up Migration
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

-- Down Migration
DROP TABLE IF EXISTS schedule_slots;
