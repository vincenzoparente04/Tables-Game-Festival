-- Up Migration
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

-- Down Migration
-- Removing the event types cascades to their pipeline_stages.
DELETE FROM event_types WHERE key IN ('festival','fair','concert','conference','dinner');
