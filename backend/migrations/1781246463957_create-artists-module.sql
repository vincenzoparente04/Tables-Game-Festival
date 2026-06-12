-- Up Migration
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

-- Down Migration
DROP TABLE IF EXISTS event_artists;
DROP TABLE IF EXISTS artists;
