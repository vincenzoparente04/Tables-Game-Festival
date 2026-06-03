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

  const lines: QuoteLine[] = rows.map((r) => {
    const unit_price = Number(r.unit_price)
    return {
      description: `${r.label} (${r.unit})`,
      quantity: r.quantity,
      unit_price,
      line_total: Math.round(unit_price * r.quantity * 100) / 100,
    }
  })

  const subtotal = Math.round(lines.reduce((sum, l) => sum + l.line_total, 0) * 100) / 100
  const discount = Number(booking.discount_amount)
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100)

  return { booking_id: bookingId, subtotal, discount, total, lines }
}
