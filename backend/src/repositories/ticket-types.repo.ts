import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface TicketTypeRow {
  id: number
  event_id: number
  name: string
  description: string | null
  price: string
  currency: string
  capacity: number | null
  sales_start_at: string | null
  sales_end_at: string | null
  max_per_order: number
  status: string
  position: number
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TicketTypeListRow extends TicketTypeRow {
  sold: number
}

export interface CreateTicketTypeInput {
  event_id: number
  name: string
  description?: string
  price?: number
  currency?: string
  capacity?: number
  sales_start_at?: string
  sales_end_at?: string
  max_per_order?: number
  status?: string
  position?: number
  attributes?: Record<string, unknown>
}

export interface UpdateTicketTypeInput {
  name?: string
  description?: string | null
  price?: number
  currency?: string
  capacity?: number | null
  sales_start_at?: string | null
  sales_end_at?: string | null
  max_per_order?: number
  status?: string
  position?: number
  attributes?: Record<string, unknown>
}

const TABLE = 'ticket_types'
const UPDATABLE = [
  'name', 'description', 'price', 'currency', 'capacity', 'sales_start_at',
  'sales_end_at', 'max_per_order', 'status', 'position', 'attributes',
] as const

// Tickets that hold capacity: any non-cancelled ticket whose order is
// confirmed or still-pending (not yet expired).
export const SOLD_TICKETS_FILTER = `
  t.status <> 'cancelled'
  AND (o.status = 'confirmed' OR (o.status = 'pending' AND o.expires_at > now()))`

export async function listTicketTypes(eventId?: number): Promise<TicketTypeListRow[]> {
  const { rows } = await pool.query<TicketTypeListRow>(
    `SELECT tt.*, COALESCE(sold.n, 0)::int AS sold
       FROM ticket_types tt
       LEFT JOIN (
         SELECT t.ticket_type_id, COUNT(*) AS n
           FROM tickets t
           JOIN orders o ON o.id = t.order_id
          WHERE ${SOLD_TICKETS_FILTER}
          GROUP BY t.ticket_type_id
       ) sold ON sold.ticket_type_id = tt.id
      WHERE ($1::int IS NULL OR tt.event_id = $1)
      ORDER BY tt.event_id, tt.position, tt.id`,
    [eventId ?? null],
  )
  return rows
}

export const getTicketType = (id: number) => findById<TicketTypeRow>(TABLE, id)
export const updateTicketType = (id: number, input: UpdateTicketTypeInput) =>
  updateById<TicketTypeRow>(TABLE, UPDATABLE, id, input as Record<string, unknown>)
export const deleteTicketType = (id: number) => deleteById(TABLE, id)

export async function getTicketTypesByIds(ids: number[]): Promise<TicketTypeRow[]> {
  if (ids.length === 0) return []
  const { rows } = await pool.query<TicketTypeRow>(
    'SELECT * FROM ticket_types WHERE id = ANY($1::int[])',
    [ids],
  )
  return rows
}

export async function hasTickets(ticketTypeId: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM tickets WHERE ticket_type_id = $1 LIMIT 1', [ticketTypeId])
  return rows.length > 0
}

export async function createTicketType(input: CreateTicketTypeInput): Promise<TicketTypeRow> {
  const { rows } = await pool.query<TicketTypeRow>(
    `INSERT INTO ticket_types
       (event_id, name, description, price, currency, capacity, sales_start_at, sales_end_at,
        max_per_order, status, position, attributes)
     VALUES ($1, $2, $3, COALESCE($4,0), COALESCE($5,'EUR'), $6, $7, $8,
             COALESCE($9,10), COALESCE($10,'on_sale'), COALESCE($11,0), COALESCE($12,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_id, input.name, input.description ?? null, input.price ?? null,
      input.currency ?? null, input.capacity ?? null, input.sales_start_at ?? null,
      input.sales_end_at ?? null, input.max_per_order ?? null, input.status ?? null,
      input.position ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}
