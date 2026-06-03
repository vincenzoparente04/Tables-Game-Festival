import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/events.repo.js'
import type { CreateEventInput, EventRow, UpdateEventInput } from '../repositories/events.repo.js'

export function listEvents(): Promise<EventRow[]> {
  return repo.listEvents()
}

export function getCurrentEvent(): Promise<EventRow | null> {
  return repo.getCurrentEvent()
}

export async function getEvent(id: number): Promise<EventRow> {
  const event = await repo.getEventById(id)
  if (!event) throw new AppError(404, 'Event not found')
  return event
}

export async function createEvent(input: CreateEventInput): Promise<EventRow> {
  if (!(await repo.eventTypeExists(input.event_type_id))) {
    throw new AppError(400, 'Unknown event type')
  }
  return repo.createEvent(input)
}

export async function updateEvent(id: number, input: UpdateEventInput): Promise<EventRow> {
  if (input.event_type_id !== undefined && !(await repo.eventTypeExists(input.event_type_id))) {
    throw new AppError(400, 'Unknown event type')
  }
  const event = await repo.updateEvent(id, input)
  if (!event) throw new AppError(404, 'Event not found')
  return event
}

export async function deleteEvent(id: number): Promise<void> {
  const deleted = await repo.deleteEvent(id)
  if (!deleted) throw new AppError(404, 'Event not found')
}

export async function setCurrentEvent(id: number): Promise<EventRow> {
  const event = await repo.setCurrentEvent(id)
  if (!event) throw new AppError(404, 'Event not found')
  return event
}
