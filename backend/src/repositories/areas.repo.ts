import pool from '../db/database.js'
import { deleteById, findById, listByEvent, updateById } from './crud.js'

export interface AreaRow {
  id: number
  event_id: number
  name: string
  kind: string
  capacity: number | null
  layout: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateAreaInput {
  event_id: number
  name: string
  kind?: string
  capacity?: number
  layout?: Record<string, unknown>
}

export type UpdateAreaInput = Partial<Omit<CreateAreaInput, 'event_id'>>

const TABLE = 'areas'
const UPDATABLE = ['name', 'kind', 'capacity', 'layout'] as const

export const listAreas = (eventId?: number) => listByEvent<AreaRow>(TABLE, eventId)
export const getArea = (id: number) => findById<AreaRow>(TABLE, id)
export const updateArea = (id: number, input: UpdateAreaInput) =>
  updateById<AreaRow>(TABLE, UPDATABLE, id, input)
export const deleteArea = (id: number) => deleteById(TABLE, id)

export async function createArea(input: CreateAreaInput): Promise<AreaRow> {
  const { rows } = await pool.query<AreaRow>(
    `INSERT INTO areas (event_id, name, kind, capacity, layout)
     VALUES ($1, $2, COALESCE($3,'indoor'), $4, COALESCE($5,'{}'::jsonb))
     RETURNING *`,
    [input.event_id, input.name, input.kind ?? null, input.capacity ?? null, input.layout ?? null],
  )
  return rows[0]!
}
