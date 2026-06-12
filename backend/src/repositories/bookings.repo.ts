import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface BookingRow {
  id: number
  event_id: number
  participant_id: number
  kind: string
  stage_id: number | null
  attendance_status: string
  notes: string | null
  discount_amount: string
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BookingListRow extends BookingRow {
  participant_name: string
  stage_key: string | null
  stage_label: string | null
  invoice_status: string // 'none' | 'draft' | 'issued' | 'paid' | 'cancelled'
}

export interface BookedResourceRow {
  id: number
  booking_id: number
  resource_type_id: number
  area_id: number | null
  quantity: number
  unit_price: string
  attributes: Record<string, unknown>
  created_at: string
}

export interface CreateBookingInput {
  event_id: number
  participant_id: number
  kind?: string
  stage_id?: number
  attendance_status?: string
  notes?: string
  discount_amount?: number
  attributes?: Record<string, unknown>
}

export type UpdateBookingInput = Partial<Omit<CreateBookingInput, 'event_id' | 'participant_id'>>

export interface BookedResourceInput {
  resource_type_id: number
  area_id?: number
  quantity: number
  unit_price?: number
}

const TABLE = 'bookings'
const UPDATABLE = ['kind', 'stage_id', 'attendance_status', 'notes', 'discount_amount', 'attributes'] as const

export async function listBookings(eventId?: number, kind?: string): Promise<BookingListRow[]> {
  const { rows } = await pool.query<BookingListRow>(
    `SELECT b.*, p.name AS participant_name, ps.key AS stage_key, ps.label AS stage_label,
            COALESCE(i.status, 'none') AS invoice_status
       FROM bookings b
       JOIN participants p ON p.id = b.participant_id
       LEFT JOIN pipeline_stages ps ON ps.id = b.stage_id
       LEFT JOIN invoices i ON i.booking_id = b.id
      WHERE ($1::int IS NULL OR b.event_id = $1)
        AND ($2::text IS NULL OR b.kind = $2)
      ORDER BY b.id`,
    [eventId ?? null, kind ?? null],
  )
  return rows
}

// An open (non-terminal-stage) agreement of the same kind for the same
// participant — surfaced as a warning when creating another one.
export async function findActiveDuplicate(
  eventId: number,
  participantId: number,
  kind: string,
): Promise<BookingRow | null> {
  const { rows } = await pool.query<BookingRow>(
    `SELECT b.*
       FROM bookings b
       LEFT JOIN pipeline_stages ps ON ps.id = b.stage_id
      WHERE b.event_id = $1 AND b.participant_id = $2 AND b.kind = $3
        AND COALESCE(ps.is_terminal, false) = false
      LIMIT 1`,
    [eventId, participantId, kind],
  )
  return rows[0] ?? null
}

export const getBookingById = (id: number) => findById<BookingRow>(TABLE, id)
export const updateBooking = (id: number, input: UpdateBookingInput) =>
  updateById<BookingRow>(TABLE, UPDATABLE, id, input)
export const deleteBooking = (id: number) => deleteById(TABLE, id)

export async function createBooking(input: CreateBookingInput): Promise<BookingRow> {
  const { rows } = await pool.query<BookingRow>(
    `INSERT INTO bookings (event_id, participant_id, kind, stage_id, attendance_status, notes, discount_amount, attributes)
     VALUES ($1, $2, COALESCE($3,'exhibitor'), $4, COALESCE($5,'unset'), $6, COALESCE($7,0), COALESCE($8,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_id, input.participant_id, input.kind ?? null, input.stage_id ?? null,
      input.attendance_status ?? null, input.notes ?? null,
      input.discount_amount ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}

export async function listBookedResources(bookingId: number): Promise<BookedResourceRow[]> {
  const { rows } = await pool.query<BookedResourceRow>(
    'SELECT * FROM booked_resources WHERE booking_id = $1 ORDER BY id',
    [bookingId],
  )
  return rows
}

export async function addBookedResource(bookingId: number, input: BookedResourceInput): Promise<BookedResourceRow> {
  const { rows } = await pool.query<BookedResourceRow>(
    `INSERT INTO booked_resources (booking_id, resource_type_id, area_id, quantity, unit_price)
     VALUES ($1, $2, $3, $4, COALESCE($5,0))
     RETURNING *`,
    [bookingId, input.resource_type_id, input.area_id ?? null, input.quantity, input.unit_price ?? null],
  )
  return rows[0]!
}

export async function deleteBookedResource(bookingId: number, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM booked_resources WHERE id = $1 AND booking_id = $2',
    [id, bookingId],
  )
  return (rowCount ?? 0) > 0
}

// --- Booking items (catalog items presented in a booking, e.g. games) ---

export interface BookingItemRow {
  id: number
  booking_id: number
  item_type: string
  item_ref: number | null
  area_id: number | null
  quantity: number
  attributes: Record<string, unknown>
  created_at: string
}

export interface BookingItemInput {
  item_type: string
  item_ref?: number
  area_id?: number
  quantity?: number
  attributes?: Record<string, unknown>
}

export async function listBookingItems(bookingId: number): Promise<BookingItemRow[]> {
  const { rows } = await pool.query<BookingItemRow>(
    'SELECT * FROM booking_items WHERE booking_id = $1 ORDER BY id',
    [bookingId],
  )
  return rows
}

export async function addBookingItem(bookingId: number, input: BookingItemInput): Promise<BookingItemRow> {
  const { rows } = await pool.query<BookingItemRow>(
    `INSERT INTO booking_items (booking_id, item_type, item_ref, area_id, quantity, attributes)
     VALUES ($1, $2, $3, $4, COALESCE($5,1), COALESCE($6,'{}'::jsonb))
     RETURNING *`,
    [bookingId, input.item_type, input.item_ref ?? null, input.area_id ?? null, input.quantity ?? null, input.attributes ?? null],
  )
  return rows[0]!
}

export async function deleteBookingItem(bookingId: number, id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM booking_items WHERE id = $1 AND booking_id = $2',
    [id, bookingId],
  )
  return (rowCount ?? 0) > 0
}
