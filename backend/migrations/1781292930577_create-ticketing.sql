-- Up Migration
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

-- Down Migration
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS ticket_types;
