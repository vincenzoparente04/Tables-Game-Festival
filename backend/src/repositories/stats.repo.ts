import pool from '../db/database.js'

export interface EventStats {
  bookings_total: number
  bookings_by_stage: { key: string | null; label: string | null; count: number }[]
  participants_total: number
  resources_capacity: number
  resources_booked: number
  revenue_invoiced: number
  revenue_paid: number
}

// Aggregated metrics for an event dashboard.
export async function getEventStats(eventId: number): Promise<EventStats> {
  const byStage = await pool.query<{ key: string | null; label: string | null; count: number }>(
    `SELECT ps.key, ps.label, count(b.id)::int AS count
       FROM bookings b
       LEFT JOIN pipeline_stages ps ON ps.id = b.stage_id
      WHERE b.event_id = $1
      GROUP BY ps.key, ps.label, ps.position
      ORDER BY ps.position NULLS LAST`,
    [eventId],
  )

  const totals = await pool.query<{ bookings: number; participants: number }>(
    `SELECT
       (SELECT count(*)::int FROM bookings WHERE event_id = $1)     AS bookings,
       (SELECT count(*)::int FROM participants WHERE event_id = $1) AS participants`,
    [eventId],
  )

  const resources = await pool.query<{ capacity: number; booked: number }>(
    `SELECT
       (SELECT COALESCE(sum(total_quantity),0)::int FROM resources WHERE event_id = $1) AS capacity,
       (SELECT COALESCE(sum(br.quantity),0)::int
          FROM booked_resources br JOIN bookings b ON b.id = br.booking_id
         WHERE b.event_id = $1) AS booked`,
    [eventId],
  )

  const revenue = await pool.query<{ invoiced: string; paid: string }>(
    `SELECT
       COALESCE(sum(total_amount) FILTER (WHERE status IN ('issued','paid')), 0) AS invoiced,
       COALESCE(sum(total_amount) FILTER (WHERE status = 'paid'), 0)             AS paid
       FROM invoices i JOIN bookings b ON b.id = i.booking_id
      WHERE b.event_id = $1`,
    [eventId],
  )

  return {
    bookings_total: totals.rows[0]?.bookings ?? 0,
    bookings_by_stage: byStage.rows.map((r) => ({ key: r.key, label: r.label, count: r.count })),
    participants_total: totals.rows[0]?.participants ?? 0,
    resources_capacity: resources.rows[0]?.capacity ?? 0,
    resources_booked: resources.rows[0]?.booked ?? 0,
    revenue_invoiced: Number(revenue.rows[0]?.invoiced ?? 0),
    revenue_paid: Number(revenue.rows[0]?.paid ?? 0),
  }
}
