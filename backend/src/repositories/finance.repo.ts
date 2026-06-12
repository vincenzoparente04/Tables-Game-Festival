import pool from '../db/database.js'

// Event finance overview: money IN (invoices issued to participants) vs
// money OUT (expenses), with a per-category breakdown.

export interface EventFinance {
  event_id: number
  income: { invoiced: number; paid: number }
  expenses: { planned: number; committed: number; paid: number; total: number }
  expenses_by_category: { category: string; total: number; paid: number }[]
  net_projected: number // invoiced income minus all tracked expenses
  net_paid: number // cash actually in minus cash actually out
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function getEventFinance(eventId: number): Promise<EventFinance> {
  const [income, expenses, byCategory] = await Promise.all([
    pool.query<{ invoiced: number; paid: number }>(
      `SELECT COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('issued','paid')), 0)::float8 AS invoiced,
              COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0)::float8 AS paid
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
        WHERE b.event_id = $1`,
      [eventId],
    ),
    pool.query<{ planned: number; committed: number; paid: number; total: number }>(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'planned'), 0)::float8 AS planned,
              COALESCE(SUM(amount) FILTER (WHERE status = 'committed'), 0)::float8 AS committed,
              COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8 AS paid,
              COALESCE(SUM(amount), 0)::float8 AS total
         FROM expenses
        WHERE event_id = $1`,
      [eventId],
    ),
    pool.query<{ category: string; total: number; paid: number }>(
      `SELECT category,
              COALESCE(SUM(amount), 0)::float8 AS total,
              COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::float8 AS paid
         FROM expenses
        WHERE event_id = $1
        GROUP BY category
        ORDER BY total DESC`,
      [eventId],
    ),
  ])
  const inc = income.rows[0]!
  const exp = expenses.rows[0]!
  return {
    event_id: eventId,
    income: { invoiced: round2(inc.invoiced), paid: round2(inc.paid) },
    expenses: {
      planned: round2(exp.planned),
      committed: round2(exp.committed),
      paid: round2(exp.paid),
      total: round2(exp.total),
    },
    expenses_by_category: byCategory.rows.map((r) => ({
      category: r.category,
      total: round2(r.total),
      paid: round2(r.paid),
    })),
    net_projected: round2(inc.invoiced - exp.total),
    net_paid: round2(inc.paid - exp.paid),
  }
}
