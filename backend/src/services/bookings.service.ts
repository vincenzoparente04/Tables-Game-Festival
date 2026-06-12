import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/bookings.repo.js'
import type {
  BookedResourceInput, BookingItemInput, BookingRow, CreateBookingInput, UpdateBookingInput,
} from '../repositories/bookings.repo.js'
import { getParticipant } from '../repositories/participants.repo.js'

export function listBookings(eventId?: number, kind?: string) {
  return repo.listBookings(eventId, kind)
}

export async function getBooking(id: number) {
  const booking = await repo.getBookingById(id)
  if (!booking) throw new AppError(404, 'Booking not found')
  const [resources, items] = await Promise.all([
    repo.listBookedResources(id),
    repo.listBookingItems(id),
  ])
  return { ...booking, resources, items }
}

// Duplicates are allowed (a vendor may legitimately hold two contracts) but flagged.
export async function createBooking(input: CreateBookingInput): Promise<BookingRow & { warnings: string[] }> {
  const participant = await getParticipant(input.participant_id)
  if (!participant || participant.event_id !== input.event_id) {
    throw new AppError(400, 'Participant does not belong to this event')
  }
  const kind = input.kind ?? 'exhibitor'
  const warnings: string[] = []
  const duplicate = await repo.findActiveDuplicate(input.event_id, input.participant_id, kind)
  if (duplicate) {
    warnings.push(`Participant already has an open '${kind}' agreement (#${duplicate.id}) for this event`)
  }
  const booking = await repo.createBooking(input)
  return { ...booking, warnings }
}

export async function updateBooking(id: number, input: UpdateBookingInput): Promise<BookingRow> {
  const booking = await repo.updateBooking(id, input)
  if (!booking) throw new AppError(404, 'Booking not found')
  return booking
}

export async function deleteBooking(id: number): Promise<void> {
  if (!(await repo.deleteBooking(id))) throw new AppError(404, 'Booking not found')
}

export async function addResource(bookingId: number, input: BookedResourceInput) {
  if (!(await repo.getBookingById(bookingId))) throw new AppError(404, 'Booking not found')
  return repo.addBookedResource(bookingId, input)
}

export async function removeResource(bookingId: number, resourceId: number): Promise<void> {
  if (!(await repo.deleteBookedResource(bookingId, resourceId))) {
    throw new AppError(404, 'Booked resource not found')
  }
}

export async function addItem(bookingId: number, input: BookingItemInput) {
  if (!(await repo.getBookingById(bookingId))) throw new AppError(404, 'Booking not found')
  return repo.addBookingItem(bookingId, input)
}

export async function removeItem(bookingId: number, itemId: number): Promise<void> {
  if (!(await repo.deleteBookingItem(bookingId, itemId))) {
    throw new AppError(404, 'Booking item not found')
  }
}
