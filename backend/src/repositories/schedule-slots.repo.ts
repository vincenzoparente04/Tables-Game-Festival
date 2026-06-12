import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface ScheduleSlotRow {
  id: number
  event_id: number
  area_id: number | null
  artist_id: number | null
  booking_id: number | null
  title: string
  kind: string
  starts_at: string
  ends_at: string
  status: string
  is_public: boolean
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ScheduleSlotListRow extends ScheduleSlotRow {
  area_name: string | null
  artist_name: string | null
}

export interface CreateScheduleSlotInput {
  event_id: number
  area_id?: number
  artist_id?: number
  booking_id?: number
  title: string
  kind?: string
  starts_at: string
  ends_at: string
  status?: string
  is_public?: boolean
  attributes?: Record<string, unknown>
}

export interface UpdateScheduleSlotInput {
  area_id?: number | null
  artist_id?: number | null
  booking_id?: number | null
  title?: string
  kind?: string
  starts_at?: string
  ends_at?: string
  status?: string
  is_public?: boolean
  attributes?: Record<string, unknown>
}

const TABLE = 'schedule_slots'
const UPDATABLE = [
  'area_id', 'artist_id', 'booking_id', 'title', 'kind',
  'starts_at', 'ends_at', 'status', 'is_public', 'attributes',
] as const

export async function listScheduleSlots(eventId?: number): Promise<ScheduleSlotListRow[]> {
  const { rows } = await pool.query<ScheduleSlotListRow>(
    `SELECT s.*, a.name AS area_name, ar.name AS artist_name
       FROM schedule_slots s
       LEFT JOIN areas a ON a.id = s.area_id
       LEFT JOIN artists ar ON ar.id = s.artist_id
      WHERE ($1::int IS NULL OR s.event_id = $1)
      ORDER BY s.starts_at, s.id`,
    [eventId ?? null],
  )
  return rows
}

export const getScheduleSlot = (id: number) => findById<ScheduleSlotRow>(TABLE, id)
export const updateScheduleSlot = (id: number, input: UpdateScheduleSlotInput) =>
  updateById<ScheduleSlotRow>(TABLE, UPDATABLE, id, input as Record<string, unknown>)
export const deleteScheduleSlot = (id: number) => deleteById(TABLE, id)

export async function createScheduleSlot(input: CreateScheduleSlotInput): Promise<ScheduleSlotRow> {
  const { rows } = await pool.query<ScheduleSlotRow>(
    `INSERT INTO schedule_slots
       (event_id, area_id, artist_id, booking_id, title, kind, starts_at, ends_at, status, is_public, attributes)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6,'performance'), $7, $8,
             COALESCE($9,'confirmed'), COALESCE($10,true), COALESCE($11,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_id, input.area_id ?? null, input.artist_id ?? null, input.booking_id ?? null,
      input.title, input.kind ?? null, input.starts_at, input.ends_at,
      input.status ?? null, input.is_public ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}
