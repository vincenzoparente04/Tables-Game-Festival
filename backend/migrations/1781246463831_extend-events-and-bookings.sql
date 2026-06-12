-- Up Migration
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

-- Down Migration
DROP INDEX IF EXISTS idx_bookings_kind;
ALTER TABLE bookings DROP COLUMN IF EXISTS kind;
ALTER TABLE bookings ADD CONSTRAINT bookings_event_id_participant_id_key UNIQUE (event_id, participant_id);
DROP INDEX IF EXISTS uq_events_single_featured;
ALTER TABLE events
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS is_featured,
  DROP COLUMN IF EXISTS hero_image_url,
  DROP COLUMN IF EXISTS subtitle,
  DROP COLUMN IF EXISTS location_address,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time;
