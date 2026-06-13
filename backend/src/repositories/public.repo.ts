import pool from '../db/database.js'

// Read-only, public-facing projections for the visitor showcase (no auth).
// Only non-sensitive fields are exposed.

const PUBLIC_EVENT_FIELDS = `
  e.id, e.name, e.slug, e.subtitle, e.description, e.venue, e.location_address,
  e.timezone, e.start_date, e.end_date, e.start_time, e.end_time,
  e.hero_image_url, e.is_featured, e.capacity,
  et.key AS event_type, et.label AS event_type_label`

export async function listPublicEvents() {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_EVENT_FIELDS}
       FROM events e
       JOIN event_types et ON et.id = e.event_type_id
      WHERE e.is_active = true AND e.status = 'published'
      ORDER BY e.is_featured DESC, e.start_date ASC NULLS LAST, e.id DESC`,
  )
  return rows
}

// Minimal slug → id lookup for public sub-resources (tickets, schedule, map).
export async function getPublicEventIdBySlug(slug: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM events WHERE slug = $1 AND is_active = true AND status = 'published'`,
    [slug],
  )
  return rows[0]?.id ?? null
}

// On-sale ticket tiers with remaining availability (NULL = unlimited).
// "Sold" counts non-cancelled tickets of confirmed or still-pending orders.
export async function listPublicTicketTypes(eventId: number) {
  const { rows } = await pool.query(
    `SELECT tt.id, tt.name, tt.description, tt.price, tt.currency, tt.capacity,
            tt.max_per_order, tt.position, tt.sales_start_at, tt.sales_end_at,
            CASE WHEN tt.capacity IS NULL THEN NULL
                 ELSE GREATEST(tt.capacity - COALESCE(sold.n, 0), 0)::int END AS available
       FROM ticket_types tt
       LEFT JOIN (
         SELECT t.ticket_type_id, COUNT(*) AS n
           FROM tickets t
           JOIN orders o ON o.id = t.order_id
          WHERE t.status <> 'cancelled'
            AND (o.status = 'confirmed' OR (o.status = 'pending' AND o.expires_at > now()))
          GROUP BY t.ticket_type_id
       ) sold ON sold.ticket_type_id = tt.id
      WHERE tt.event_id = $1 AND tt.status = 'on_sale'
        AND (tt.sales_start_at IS NULL OR tt.sales_start_at <= now())
        AND (tt.sales_end_at IS NULL OR tt.sales_end_at > now())
      ORDER BY tt.position, tt.id`,
    [eventId],
  )
  return rows
}

export async function getPublicEventBySlug(slug: string) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_EVENT_FIELDS}
       FROM events e
       JOIN event_types et ON et.id = e.event_type_id
      WHERE e.slug = $1 AND e.is_active = true AND e.status = 'published'`,
    [slug],
  )
  const event = rows[0]
  if (!event) return null

  const [areas, lineup, images] = await Promise.all([
    pool.query(`SELECT id, name, kind FROM areas WHERE event_id = $1 ORDER BY name`, [event.id]),
    pool.query(
      `SELECT a.id, a.name, a.kind, a.bio, a.image_url, a.links, ea.is_headliner
         FROM event_artists ea
         JOIN artists a ON a.id = ea.artist_id
        WHERE ea.event_id = $1
        ORDER BY ea.is_headliner DESC, ea.display_order, a.name`,
      [event.id],
    ),
    pool.query(
      `SELECT url, alt, kind FROM event_images WHERE event_id = $1 ORDER BY kind, position, id`,
      [event.id],
    ),
  ])

  return { ...event, areas: areas.rows, lineup: lineup.rows, images: images.rows }
}

// Public programme: confirmed, publicly visible slots only.
export async function getPublicSchedule(eventId: number) {
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.kind, s.starts_at, s.ends_at,
            a.name AS area_name, ar.name AS artist_name, ar.image_url AS artist_image_url
       FROM schedule_slots s
       LEFT JOIN areas a ON a.id = s.area_id
       LEFT JOIN artists ar ON ar.id = s.artist_id
      WHERE s.event_id = $1 AND s.is_public = true AND s.status = 'confirmed'
      ORDER BY s.starts_at, s.id`,
    [eventId],
  )
  return rows
}

// Public map projection: first public map, elements with resolved display
// labels only — internal booking/resource/area ids are never exposed.
export async function getPublicMap(eventId: number) {
  const { rows } = await pool.query(
    `SELECT id, name, width, height, background
       FROM venue_maps
      WHERE event_id = $1 AND is_public = true
      ORDER BY id
      LIMIT 1`,
    [eventId],
  )
  const map = rows[0]
  if (!map) return null
  const elements = await pool.query(
    `SELECT me.id, me.kind, COALESCE(me.label, p.name, r.label, a.name) AS label,
            me.x, me.y, me.width, me.height, me.rotation, me.capacity, me.color, me.z_index
       FROM map_elements me
       LEFT JOIN bookings b ON b.id = me.booking_id
       LEFT JOIN participants p ON p.id = b.participant_id
       LEFT JOIN resources r ON r.id = me.resource_id
       LEFT JOIN areas a ON a.id = me.area_id
      WHERE me.venue_map_id = $1
      ORDER BY me.z_index, me.id`,
    [map.id],
  )
  return { ...map, elements: elements.rows }
}
