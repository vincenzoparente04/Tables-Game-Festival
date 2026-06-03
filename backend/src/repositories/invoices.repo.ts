import pool from '../db/database.js'
import { deleteById, findById } from './crud.js'
import type { QuoteLine } from '../services/pricing.service.js'

export interface InvoiceRow {
  id: number
  booking_id: number
  invoice_number: string | null
  status: string
  total_amount: string
  issued_at: string | null
  paid_at: string | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface InvoiceLineRow {
  id: number
  invoice_id: number
  description: string
  quantity: string
  unit_price: string
  line_total: string
  created_at: string
}

const TABLE = 'invoices'

export const getInvoiceById = (id: number) => findById<InvoiceRow>(TABLE, id)
export const deleteInvoice = (id: number) => deleteById(TABLE, id)

export async function listInvoices(eventId?: number, bookingId?: number): Promise<InvoiceRow[]> {
  const { rows } = await pool.query<InvoiceRow>(
    `SELECT i.* FROM invoices i
       JOIN bookings b ON b.id = i.booking_id
      WHERE ($1::int IS NULL OR b.event_id = $1)
        AND ($2::int IS NULL OR i.booking_id = $2)
      ORDER BY i.id`,
    [eventId ?? null, bookingId ?? null],
  )
  return rows
}

export async function getInvoiceLines(invoiceId: number): Promise<InvoiceLineRow[]> {
  const { rows } = await pool.query<InvoiceLineRow>(
    'SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY id',
    [invoiceId],
  )
  return rows
}

// Creates or refreshes the invoice for a booking (one invoice per booking),
// replacing its lines. Runs in a transaction.
export async function upsertInvoiceWithLines(
  bookingId: number,
  total: number,
  lines: QuoteLine[],
): Promise<InvoiceRow> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query<InvoiceRow>(
      'SELECT * FROM invoices WHERE booking_id = $1',
      [bookingId],
    )

    let invoice: InvoiceRow
    if (existing.rows[0]) {
      const { rows } = await client.query<InvoiceRow>(
        `UPDATE invoices
            SET total_amount = $2, status = 'issued', issued_at = now()
          WHERE id = $1 RETURNING *`,
        [existing.rows[0].id, total],
      )
      invoice = rows[0]!
      await client.query('DELETE FROM invoice_lines WHERE invoice_id = $1', [invoice.id])
    } else {
      const { rows } = await client.query<InvoiceRow>(
        `INSERT INTO invoices (booking_id, invoice_number, status, total_amount, issued_at)
         VALUES ($1, $2, 'issued', $3, now()) RETURNING *`,
        [bookingId, `INV-${bookingId}`, total],
      )
      invoice = rows[0]!
    }

    for (const line of lines) {
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, description, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [invoice.id, line.description, line.quantity, line.unit_price],
      )
    }

    await client.query('COMMIT')
    return invoice
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function markPaid(id: number): Promise<InvoiceRow | null> {
  const { rows } = await pool.query<InvoiceRow>(
    `UPDATE invoices SET status = 'paid', paid_at = now() WHERE id = $1 RETURNING *`,
    [id],
  )
  return rows[0] ?? null
}
