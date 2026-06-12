import pool from '../db/database.js'
import { SOLD_TICKETS_FILTER } from './ticket-types.repo.js'

export interface OrderRow {
  id: number
  event_id: number
  code: string
  customer_name: string
  customer_email: string
  status: string
  total_amount: string
  currency: string
  payment_provider: string
  payment_ref: string | null
  expires_at: string | null
  confirmed_at: string | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrderListRow extends OrderRow {
  tickets_count: number
}

export interface TicketRow {
  id: number
  order_id: number
  ticket_type_id: number
  code: string
  attendee_name: string | null
  status: string
  checked_in_at: string | null
  created_at: string
}

export interface TicketDetailRow extends TicketRow {
  ticket_type_name: string
}

// Ticket joined with its order, for check-in lookups.
export interface TicketLookupRow extends TicketDetailRow {
  order_code: string
  order_status: string
  event_id: number
  customer_name: string
}

export interface NewTicketSpec {
  ticket_type_id: number
  code: string
  attendee_name?: string
}

export interface CreateOrderTxInput {
  event_id: number
  code: string
  customer_name: string
  customer_email: string
  status: 'pending' | 'confirmed'
  total_amount: number
  currency: string
  payment_provider: 'none' | 'stripe'
  expires_at: string | null
  tickets: NewTicketSpec[]
}

export type CreateOrderTxResult =
  | { ok: true; order: OrderRow; tickets: TicketRow[] }
  | { ok: false; reason: 'type_capacity'; ticket_type_id: number }
  | { ok: false; reason: 'event_capacity' }

// Creates the order + its tickets while enforcing capacity in one transaction.
// Locks the event row first, then the involved ticket-type rows in id order
// (consistent lock ordering = no deadlocks); counts already-sold tickets
// (confirmed + still-pending orders) and rejects when a limit would be passed.
export async function createOrderWithTickets(input: CreateOrderTxInput): Promise<CreateOrderTxResult> {
  const typeIds = [...new Set(input.tickets.map((t) => t.ticket_type_id))].sort((a, b) => a - b)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lazy sweep: stale pending orders stop holding capacity right here.
    await client.query(
      `UPDATE orders SET status = 'expired'
        WHERE event_id = $1 AND status = 'pending' AND expires_at <= now()`,
      [input.event_id],
    )

    const eventRes = await client.query<{ capacity: number | null }>(
      'SELECT capacity FROM events WHERE id = $1 FOR UPDATE',
      [input.event_id],
    )
    const eventCapacity = eventRes.rows[0]?.capacity ?? null

    const typesRes = await client.query<{ id: number; capacity: number | null }>(
      'SELECT id, capacity FROM ticket_types WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE',
      [typeIds],
    )
    const capacityByType = new Map(typesRes.rows.map((r) => [r.id, r.capacity]))

    const soldRes = await client.query<{ ticket_type_id: number; n: number }>(
      `SELECT t.ticket_type_id, COUNT(*)::int AS n
         FROM tickets t
         JOIN orders o ON o.id = t.order_id
        WHERE t.ticket_type_id = ANY($1::int[]) AND ${SOLD_TICKETS_FILTER}
        GROUP BY t.ticket_type_id`,
      [typeIds],
    )
    const soldByType = new Map(soldRes.rows.map((r) => [r.ticket_type_id, r.n]))

    const requestedByType = new Map<number, number>()
    for (const t of input.tickets) {
      requestedByType.set(t.ticket_type_id, (requestedByType.get(t.ticket_type_id) ?? 0) + 1)
    }
    for (const [typeId, requested] of requestedByType) {
      const capacity = capacityByType.get(typeId)
      if (capacity == null) continue
      if ((soldByType.get(typeId) ?? 0) + requested > capacity) {
        await client.query('ROLLBACK')
        return { ok: false, reason: 'type_capacity', ticket_type_id: typeId }
      }
    }

    if (eventCapacity != null) {
      const eventSoldRes = await client.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n
           FROM tickets t
           JOIN orders o ON o.id = t.order_id
          WHERE o.event_id = $1 AND ${SOLD_TICKETS_FILTER}`,
        [input.event_id],
      )
      if ((eventSoldRes.rows[0]?.n ?? 0) + input.tickets.length > eventCapacity) {
        await client.query('ROLLBACK')
        return { ok: false, reason: 'event_capacity' }
      }
    }

    const orderRes = await client.query<OrderRow>(
      `INSERT INTO orders
         (event_id, code, customer_name, customer_email, status, total_amount, currency,
          payment_provider, expires_at, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $5 = 'confirmed' THEN now() END)
       RETURNING *`,
      [
        input.event_id, input.code, input.customer_name, input.customer_email,
        input.status, input.total_amount, input.currency, input.payment_provider,
        input.expires_at,
      ],
    )
    const order = orderRes.rows[0]!

    const tickets: TicketRow[] = []
    for (const t of input.tickets) {
      const { rows } = await client.query<TicketRow>(
        `INSERT INTO tickets (order_id, ticket_type_id, code, attendee_name)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [order.id, t.ticket_type_id, t.code, t.attendee_name ?? null],
      )
      tickets.push(rows[0]!)
    }

    await client.query('COMMIT')
    return { ok: true, order, tickets }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getOrderById(id: number): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function getOrderByCode(code: string): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>('SELECT * FROM orders WHERE code = $1', [code])
  return rows[0] ?? null
}

export async function getOrderTickets(orderId: number): Promise<TicketDetailRow[]> {
  const { rows } = await pool.query<TicketDetailRow>(
    `SELECT t.*, tt.name AS ticket_type_name
       FROM tickets t
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
      WHERE t.order_id = $1
      ORDER BY t.id`,
    [orderId],
  )
  return rows
}

export async function listOrders(eventId?: number, status?: string): Promise<OrderListRow[]> {
  const { rows } = await pool.query<OrderListRow>(
    `SELECT o.*, COUNT(t.id)::int AS tickets_count
       FROM orders o
       LEFT JOIN tickets t ON t.order_id = o.id
      WHERE ($1::int IS NULL OR o.event_id = $1)
        AND ($2::text IS NULL OR o.status = $2)
      GROUP BY o.id
      ORDER BY o.id DESC`,
    [eventId ?? null, status ?? null],
  )
  return rows
}

export async function expireStaleOrders(eventId?: number): Promise<void> {
  await pool.query(
    `UPDATE orders SET status = 'expired'
      WHERE ($1::int IS NULL OR event_id = $1)
        AND status = 'pending' AND expires_at <= now()`,
    [eventId ?? null],
  )
}

export async function setPaymentRef(orderId: number, paymentRef: string): Promise<void> {
  await pool.query('UPDATE orders SET payment_ref = $2 WHERE id = $1', [orderId, paymentRef])
}

// Idempotent: only flips pending → confirmed; replayed webhooks match 0 rows.
export async function confirmByPaymentRef(paymentRef: string): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>(
    `UPDATE orders SET status = 'confirmed', confirmed_at = now()
      WHERE payment_ref = $1 AND status = 'pending'
      RETURNING *`,
    [paymentRef],
  )
  return rows[0] ?? null
}

export async function expireByPaymentRef(paymentRef: string): Promise<OrderRow | null> {
  const { rows } = await pool.query<OrderRow>(
    `UPDATE orders SET status = 'expired'
      WHERE payment_ref = $1 AND status = 'pending'
      RETURNING *`,
    [paymentRef],
  )
  return rows[0] ?? null
}

// Cancels the order and voids its tickets (capacity is freed immediately).
export async function cancelOrder(id: number): Promise<OrderRow | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<OrderRow>(
      `UPDATE orders SET status = 'cancelled'
        WHERE id = $1 AND status IN ('pending','confirmed')
        RETURNING *`,
      [id],
    )
    const order = rows[0] ?? null
    if (order) {
      await client.query(
        `UPDATE tickets SET status = 'cancelled' WHERE order_id = $1 AND status <> 'checked_in'`,
        [id],
      )
    }
    await client.query('COMMIT')
    return order
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getTicketByCode(code: string): Promise<TicketLookupRow | null> {
  const { rows } = await pool.query<TicketLookupRow>(
    `SELECT t.*, tt.name AS ticket_type_name,
            o.code AS order_code, o.status AS order_status, o.event_id, o.customer_name
       FROM tickets t
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       JOIN orders o ON o.id = t.order_id
      WHERE t.code = $1`,
    [code],
  )
  return rows[0] ?? null
}

// Race-safe: only a 'valid' ticket flips to checked_in.
export async function checkInTicket(ticketId: number): Promise<TicketRow | null> {
  const { rows } = await pool.query<TicketRow>(
    `UPDATE tickets SET status = 'checked_in', checked_in_at = now()
      WHERE id = $1 AND status = 'valid'
      RETURNING *`,
    [ticketId],
  )
  return rows[0] ?? null
}
