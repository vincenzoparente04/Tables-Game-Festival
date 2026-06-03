import pool from '../db/database.js'
import { deleteById, findById, listByEvent, updateById } from './crud.js'

export interface ResourceTypeRow {
  id: number
  event_id: number | null
  key: string
  label: string
  unit: string
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateResourceTypeInput {
  event_id?: number
  key: string
  label: string
  unit?: string
  attributes?: Record<string, unknown>
}

export type UpdateResourceTypeInput = Partial<Omit<CreateResourceTypeInput, 'event_id'>>

const TABLE = 'resource_types'
const UPDATABLE = ['key', 'label', 'unit', 'attributes'] as const

export const listResourceTypes = (eventId?: number) => listByEvent<ResourceTypeRow>(TABLE, eventId)
export const getResourceType = (id: number) => findById<ResourceTypeRow>(TABLE, id)
export const updateResourceType = (id: number, input: UpdateResourceTypeInput) =>
  updateById<ResourceTypeRow>(TABLE, UPDATABLE, id, input)
export const deleteResourceType = (id: number) => deleteById(TABLE, id)

export async function createResourceType(input: CreateResourceTypeInput): Promise<ResourceTypeRow> {
  const { rows } = await pool.query<ResourceTypeRow>(
    `INSERT INTO resource_types (event_id, key, label, unit, attributes)
     VALUES ($1, $2, $3, COALESCE($4,'unit'), COALESCE($5,'{}'::jsonb))
     RETURNING *`,
    [input.event_id ?? null, input.key, input.label, input.unit ?? null, input.attributes ?? null],
  )
  return rows[0]!
}
