import pool from '../db/database.js'

// Read-only, public-facing projections for the visitor showcase (no auth).
// Only non-sensitive fields are exposed.

export async function listPublicEvents() {
  const { rows } = await pool.query(
    `SELECT e.id, e.name, e.slug, e.description, e.venue, e.timezone,
            e.start_date, e.end_date, et.key AS event_type, et.label AS event_type_label
       FROM events e
       JOIN event_types et ON et.id = e.event_type_id
      WHERE e.is_active = true AND e.status = 'published'
      ORDER BY e.start_date DESC NULLS LAST, e.id DESC`,
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
    `SELECT e.id, e.name, e.slug, e.description, e.venue, e.timezone,
            e.start_date, e.end_date, et.key AS event_type, et.label AS event_type_label
       FROM events e
       JOIN event_types et ON et.id = e.event_type_id
      WHERE e.slug = $1 AND e.is_active = true AND e.status = 'published'`,
    [slug],
  )
  const event = rows[0]
  if (!event) return null

  const [areas, participants, games] = await Promise.all([
    pool.query(`SELECT id, name, kind FROM areas WHERE event_id = $1 ORDER BY name`, [event.id]),
    pool.query(
      `SELECT id, name, participant_type FROM participants WHERE event_id = $1 ORDER BY name`,
      [event.id],
    ),
    pool.query(
      `SELECT DISTINCT g.id, g.name, g.category, g.min_players, g.max_players, g.min_age
         FROM booking_items bi
         JOIN bookings b ON b.id = bi.booking_id
         JOIN games g ON g.id = bi.item_ref
        WHERE b.event_id = $1 AND bi.item_type = 'game'
        ORDER BY g.name`,
      [event.id],
    ),
  ])

  return { ...event, areas: areas.rows, participants: participants.rows, games: games.rows }
}
