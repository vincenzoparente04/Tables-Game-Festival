import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface EventArtistRow {
  id: number
  event_id: number
  artist_id: number
  booking_id: number | null
  is_headliner: boolean
  display_order: number
  created_at: string
}

export interface EventArtistListRow extends EventArtistRow {
  artist_name: string
  artist_kind: string
  artist_image_url: string | null
}

export interface CreateEventArtistInput {
  event_id: number
  artist_id: number
  booking_id?: number
  is_headliner?: boolean
  display_order?: number
}

export interface UpdateEventArtistInput {
  booking_id?: number | null
  is_headliner?: boolean
  display_order?: number
}

const TABLE = 'event_artists'
const UPDATABLE = ['booking_id', 'is_headliner', 'display_order'] as const

export async function listEventArtists(eventId: number): Promise<EventArtistListRow[]> {
  const { rows } = await pool.query<EventArtistListRow>(
    `SELECT ea.*, a.name AS artist_name, a.kind AS artist_kind, a.image_url AS artist_image_url
       FROM event_artists ea
       JOIN artists a ON a.id = ea.artist_id
      WHERE ea.event_id = $1
      ORDER BY ea.is_headliner DESC, ea.display_order, a.name`,
    [eventId],
  )
  return rows
}

export const getEventArtist = (id: number) => findById<EventArtistRow>(TABLE, id)
export const updateEventArtist = (id: number, input: UpdateEventArtistInput) =>
  updateById<EventArtistRow>(TABLE, UPDATABLE, id, input as Record<string, unknown>)
export const deleteEventArtist = (id: number) => deleteById(TABLE, id)

export async function createEventArtist(input: CreateEventArtistInput): Promise<EventArtistRow> {
  const { rows } = await pool.query<EventArtistRow>(
    `INSERT INTO event_artists (event_id, artist_id, booking_id, is_headliner, display_order)
     VALUES ($1, $2, $3, COALESCE($4,false), COALESCE($5,0))
     RETURNING *`,
    [
      input.event_id, input.artist_id, input.booking_id ?? null,
      input.is_headliner ?? null, input.display_order ?? null,
    ],
  )
  return rows[0]!
}
