-- Up Migration
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

-- Down Migration
DROP TABLE IF EXISTS event_images;
DROP TABLE IF EXISTS expenses;
