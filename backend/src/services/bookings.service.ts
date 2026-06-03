import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/bookings.repo.js'
import type {
  BookedResourceInput, BookingRow, CreateBookingInput, UpdateBookingInput,
} from '../repositories/bookings.repo.js'
import { getParticipant } from '../repositories/participants.repo.js'

export function listBookings(eventId?: number) {
  return repo.listBookings(eventId)
}

export async function getBooking(id: number): Promise<BookingRow & { resources: unknown[] }> {
  const booking = await repo.getBookingById(id)
  if (!booking) throw new AppError(404, 'Booking not found')
  return { ...booking, resources: await repo.listBookedResources(id) }
}

export async function createBooking(input: CreateBookingInput): Promise<BookingRow> {
  const participant = await getParticipant(input.participant_id)
  if (!participant || participant.event_id !== input.event_id) {
    throw new AppError(400, 'Participant does not belong to this event')
  }
  return repo.createBooking(input)
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
