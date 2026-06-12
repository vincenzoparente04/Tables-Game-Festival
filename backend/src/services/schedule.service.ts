import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/schedule-slots.repo.js'
import type {
  CreateScheduleSlotInput, ScheduleSlotListRow, ScheduleSlotRow, UpdateScheduleSlotInput,
} from '../repositories/schedule-slots.repo.js'
import { getEventById } from '../repositories/events.repo.js'
import { getArea } from '../repositories/areas.repo.js'
import { getArtist } from '../repositories/artists.repo.js'
import { getBookingById } from '../repositories/bookings.repo.js'

// Minimal slot shape needed for conflict detection (pure, unit-tested).
export interface ConflictCheckSlot {
  id?: number
  title: string
  area_id: number | null
  artist_id: number | null
  starts_at: string
  ends_at: string
  status: string
}

// Same-area or same-artist time overlap → human-readable warnings (never a
// hard block: overlapping on purpose is a legitimate organizer decision).
// Touching edges (A ends exactly when B starts) is NOT an overlap.
export function findConflicts(candidate: ConflictCheckSlot, existing: ConflictCheckSlot[]): string[] {
  const warnings: string[] = []
  if (candidate.status === 'cancelled') return warnings
  const cStart = new Date(candidate.starts_at).getTime()
  const cEnd = new Date(candidate.ends_at).getTime()
  for (const slot of existing) {
    if (candidate.id !== undefined && slot.id === candidate.id) continue
    if (slot.status === 'cancelled') continue
    const overlaps = cStart < new Date(slot.ends_at).getTime() && new Date(slot.starts_at).getTime() < cEnd
    if (!overlaps) continue
    if (candidate.area_id != null && slot.area_id === candidate.area_id) {
      warnings.push(`Time overlap with "${slot.title}" in the same area`)
    }
    if (candidate.artist_id != null && slot.artist_id === candidate.artist_id) {
      warnings.push(`Artist is already scheduled in "${slot.title}" at an overlapping time`)
    }
  }
  return warnings
}

export type SlotWithWarnings = ScheduleSlotRow & { warnings: string[] }

export function listSlots(eventId?: number): Promise<ScheduleSlotListRow[]> {
  return repo.listScheduleSlots(eventId)
}

export async function getSlot(id: number): Promise<ScheduleSlotRow> {
  const slot = await repo.getScheduleSlot(id)
  if (!slot) throw new AppError(404, 'Schedule slot not found')
  return slot
}

function assertTimeOrder(startsAt: string, endsAt: string): void {
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new AppError(400, 'ends_at must be after starts_at')
  }
}

async function validateRefs(
  eventId: number,
  input: { area_id?: number | null; artist_id?: number | null; booking_id?: number | null },
): Promise<void> {
  if (input.area_id != null) {
    const area = await getArea(input.area_id)
    if (!area || area.event_id !== eventId) throw new AppError(400, 'Area does not belong to this event')
  }
  if (input.artist_id != null && !(await getArtist(input.artist_id))) {
    throw new AppError(400, 'Unknown artist')
  }
  if (input.booking_id != null) {
    const booking = await getBookingById(input.booking_id)
    if (!booking || booking.event_id !== eventId) throw new AppError(400, 'Booking does not belong to this event')
  }
}

export async function createSlot(input: CreateScheduleSlotInput): Promise<SlotWithWarnings> {
  if (!(await getEventById(input.event_id))) throw new AppError(400, 'Unknown event')
  assertTimeOrder(input.starts_at, input.ends_at)
  await validateRefs(input.event_id, input)
  const warnings = findConflicts(
    {
      title: input.title,
      area_id: input.area_id ?? null,
      artist_id: input.artist_id ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status: input.status ?? 'confirmed',
    },
    await repo.listScheduleSlots(input.event_id),
  )
  const slot = await repo.createScheduleSlot(input)
  return { ...slot, warnings }
}

export async function updateSlot(id: number, input: UpdateScheduleSlotInput): Promise<SlotWithWarnings> {
  const existing = await getSlot(id)
  const candidate: ConflictCheckSlot = {
    id,
    title: input.title ?? existing.title,
    area_id: input.area_id === undefined ? existing.area_id : input.area_id,
    artist_id: input.artist_id === undefined ? existing.artist_id : input.artist_id,
    starts_at: input.starts_at ?? existing.starts_at,
    ends_at: input.ends_at ?? existing.ends_at,
    status: input.status ?? existing.status,
  }
  assertTimeOrder(candidate.starts_at, candidate.ends_at)
  await validateRefs(existing.event_id, input)
  const warnings = findConflicts(candidate, await repo.listScheduleSlots(existing.event_id))
  const updated = await repo.updateScheduleSlot(id, input)
  if (!updated) throw new AppError(404, 'Schedule slot not found')
  return { ...updated, warnings }
}

export async function deleteSlot(id: number): Promise<void> {
  if (!(await repo.deleteScheduleSlot(id))) throw new AppError(404, 'Schedule slot not found')
}
