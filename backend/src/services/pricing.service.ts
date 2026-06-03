import pool from '../db/database.js'
import { AppError } from '../middleware/error-handler.js'
import { getBookingById } from '../repositories/bookings.repo.js'

// Pricing computation in the application layer (replaces the PL/pgSQL
// calculer_prix_reservation function): a booking's total is the sum of its
// booked resources (quantity x unit_price) minus the booking discount.

export interface QuoteLine {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Quote {
  booking_id: number
  subtotal: number
  discount: number
  total: number
  lines: QuoteLine[]
}

export interface PricedItem {
  label: string
  unit: string
  quantity: number
  unit_price: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Pure pricing math (no I/O) — unit-tested independently of the database.
export function calculateQuote(items: PricedItem[], discount: number): Omit<Quote, 'booking_id'> {
  const lines: QuoteLine[] = items.map((item) => ({
    description: `${item.label} (${item.unit})`,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: round2(item.unit_price * item.quantity),
  }))
  const subtotal = round2(lines.reduce((sum, line) => sum + line.line_total, 0))
  const total = Math.max(0, round2(subtotal - discount))
  return { subtotal, discount: round2(discount), total, lines }
}

interface BookedResourceJoin {
  label: string
  unit: string
  quantity: number
  unit_price: string
}

export async function computeBookingQuote(bookingId: number): Promise<Quote> {
  const booking = await getBookingById(bookingId)
  if (!booking) throw new AppError(404, 'Booking not found')

  const { rows } = await pool.query<BookedResourceJoin>(
    `SELECT rt.label, rt.unit, br.quantity, br.unit_price
       FROM booked_resources br
       JOIN resource_types rt ON rt.id = br.resource_type_id
      WHERE br.booking_id = $1
      ORDER BY br.id`,
    [bookingId],
  )

  const items: PricedItem[] = rows.map((r) => ({
    label: r.label,
    unit: r.unit,
    quantity: r.quantity,
    unit_price: Number(r.unit_price),
  }))

  return { booking_id: bookingId, ...calculateQuote(items, Number(booking.discount_amount)) }
}
