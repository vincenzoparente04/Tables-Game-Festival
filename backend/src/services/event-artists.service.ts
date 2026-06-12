import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/event-artists.repo.js'
import type {
  CreateEventArtistInput, EventArtistRow, UpdateEventArtistInput,
} from '../repositories/event-artists.repo.js'
import { getEventById } from '../repositories/events.repo.js'
import { getArtist } from '../repositories/artists.repo.js'
import { getBookingById } from '../repositories/bookings.repo.js'

export function listLineup(eventId: number) {
  return repo.listEventArtists(eventId)
}

async function assertBookingInEvent(bookingId: number, eventId: number): Promise<void> {
  const booking = await getBookingById(bookingId)
  if (!booking || booking.event_id !== eventId) {
    throw new AppError(400, 'Booking does not belong to this event')
  }
}

export async function addToLineup(input: CreateEventArtistInput): Promise<EventArtistRow> {
  if (!(await getEventById(input.event_id))) throw new AppError(400, 'Unknown event')
  if (!(await getArtist(input.artist_id))) throw new AppError(400, 'Unknown artist')
  if (input.booking_id !== undefined) await assertBookingInEvent(input.booking_id, input.event_id)
  return repo.createEventArtist(input)
}

export async function updateLineupEntry(id: number, input: UpdateEventArtistInput): Promise<EventArtistRow> {
  const entry = await repo.getEventArtist(id)
  if (!entry) throw new AppError(404, 'Lineup entry not found')
  if (input.booking_id !== undefined && input.booking_id !== null) {
    await assertBookingInEvent(input.booking_id, entry.event_id)
  }
  const updated = await repo.updateEventArtist(id, input)
  if (!updated) throw new AppError(404, 'Lineup entry not found')
  return updated
}

export async function removeFromLineup(id: number): Promise<void> {
  if (!(await repo.deleteEventArtist(id))) throw new AppError(404, 'Lineup entry not found')
}
