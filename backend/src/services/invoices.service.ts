import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/invoices.repo.js'
import type { InvoiceRow } from '../repositories/invoices.repo.js'
import { computeBookingQuote } from './pricing.service.js'

export function listInvoices(eventId?: number, bookingId?: number) {
  return repo.listInvoices(eventId, bookingId)
}

export async function getInvoice(id: number) {
  const invoice = await repo.getInvoiceById(id)
  if (!invoice) throw new AppError(404, 'Invoice not found')
  return { ...invoice, lines: await repo.getInvoiceLines(id) }
}

// Creates or refreshes the invoice for a booking from its computed quote.
export async function generateForBooking(bookingId: number): Promise<InvoiceRow> {
  const quote = await computeBookingQuote(bookingId) // throws 404 if booking missing
  return repo.upsertInvoiceWithLines(bookingId, quote.total, quote.lines)
}

export async function markPaid(id: number): Promise<InvoiceRow> {
  const invoice = await repo.markPaid(id)
  if (!invoice) throw new AppError(404, 'Invoice not found')
  return invoice
}

export async function deleteInvoice(id: number): Promise<void> {
  if (!(await repo.deleteInvoice(id))) throw new AppError(404, 'Invoice not found')
}
