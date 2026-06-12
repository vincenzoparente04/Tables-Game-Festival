-- Up Migration
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

-- Down Migration
DROP TABLE IF EXISTS map_elements;
DROP TABLE IF EXISTS venue_maps;
