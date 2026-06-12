import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface EventImageRow {
  id: number
  event_id: number
  url: string
  public_id: string | null
  kind: string
  position: number
  alt: string | null
  created_at: string
}

export interface CreateEventImageInput {
  event_id: number
  url: string
  public_id?: string
  kind?: string
  position?: number
  alt?: string
}

export interface UpdateEventImageInput {
  kind?: string
  position?: number
  alt?: string | null
}

const TABLE = 'event_images'
const UPDATABLE = ['kind', 'position', 'alt'] as const

export async function listEventImages(eventId?: number): Promise<EventImageRow[]> {
  const { rows } = await pool.query<EventImageRow>(
    `SELECT * FROM event_images
      WHERE ($1::int IS NULL OR event_id = $1)
      ORDER BY kind, position, id`,
    [eventId ?? null],
  )
  return rows
}

export const getEventImage = (id: number) => findById<EventImageRow>(TABLE, id)
export const updateEventImage = (id: number, input: UpdateEventImageInput) =>
  updateById<EventImageRow>(TABLE, UPDATABLE, id, input as Record<string, unknown>)
export const deleteEventImage = (id: number) => deleteById(TABLE, id)

export async function createEventImage(input: CreateEventImageInput): Promise<EventImageRow> {
  const { rows } = await pool.query<EventImageRow>(
    `INSERT INTO event_images (event_id, url, public_id, kind, position, alt)
     VALUES ($1, $2, $3, COALESCE($4,'gallery'), COALESCE($5,0), $6)
     RETURNING *`,
    [
      input.event_id, input.url, input.public_id ?? null,
      input.kind ?? null, input.position ?? null, input.alt ?? null,
    ],
  )
  return rows[0]!
}
