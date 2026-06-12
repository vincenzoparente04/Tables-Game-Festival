import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/expenses.repo.js'
import type {
  CreateExpenseInput, ExpenseListRow, ExpenseRow, UpdateExpenseInput,
} from '../repositories/expenses.repo.js'
import { getEventById } from '../repositories/events.repo.js'
import { getBookingById } from '../repositories/bookings.repo.js'
import { getParticipant } from '../repositories/participants.repo.js'

export function listExpenses(eventId?: number, status?: string, category?: string): Promise<ExpenseListRow[]> {
  return repo.listExpenses(eventId, status, category)
}

export async function getExpense(id: number): Promise<ExpenseRow> {
  const expense = await repo.getExpense(id)
  if (!expense) throw new AppError(404, 'Expense not found')
  return expense
}

async function validateRefs(
  eventId: number,
  input: { booking_id?: number | null; participant_id?: number | null },
): Promise<void> {
  if (input.booking_id != null) {
    const booking = await getBookingById(input.booking_id)
    if (!booking || booking.event_id !== eventId) throw new AppError(400, 'Booking does not belong to this event')
  }
  if (input.participant_id != null) {
    const participant = await getParticipant(input.participant_id)
    if (!participant || participant.event_id !== eventId) {
      throw new AppError(400, 'Participant does not belong to this event')
    }
  }
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  if (!(await getEventById(input.event_id))) throw new AppError(400, 'Unknown event')
  await validateRefs(input.event_id, input)
  const create: CreateExpenseInput = { ...input }
  if (create.status === 'paid' && create.paid_at === undefined) {
    create.paid_at = new Date().toISOString()
  }
  return repo.createExpense(create)
}

export async function updateExpense(id: number, input: UpdateExpenseInput): Promise<ExpenseRow> {
  const existing = await getExpense(id)
  await validateRefs(existing.event_id, input)
  const patch: UpdateExpenseInput = { ...input }
  // Keep paid_at coherent with the status unless the caller sets it explicitly.
  if (patch.paid_at === undefined && patch.status !== undefined && patch.status !== existing.status) {
    patch.paid_at = patch.status === 'paid' ? new Date().toISOString() : null
  }
  const updated = await repo.updateExpense(id, patch)
  if (!updated) throw new AppError(404, 'Expense not found')
  return updated
}

export async function deleteExpense(id: number): Promise<void> {
  if (!(await repo.deleteExpense(id))) throw new AppError(404, 'Expense not found')
}
