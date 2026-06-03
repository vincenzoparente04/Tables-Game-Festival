import pool from '../db/database.js'
import { deleteById, findById, listByEvent, updateById } from './crud.js'

export interface ResourceRow {
  id: number
  event_id: number
  area_id: number | null
  resource_type_id: number
  label: string | null
  total_quantity: number
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateResourceInput {
  event_id: number
  resource_type_id: number
  area_id?: number
  label?: string
  total_quantity?: number
  attributes?: Record<string, unknown>
}

export type UpdateResourceInput = Partial<Omit<CreateResourceInput, 'event_id'>>

const TABLE = 'resources'
const UPDATABLE = ['area_id', 'resource_type_id', 'label', 'total_quantity', 'attributes'] as const

export const listResources = (eventId?: number) => listByEvent<ResourceRow>(TABLE, eventId)
export const getResource = (id: number) => findById<ResourceRow>(TABLE, id)
export const updateResource = (id: number, input: UpdateResourceInput) =>
  updateById<ResourceRow>(TABLE, UPDATABLE, id, input)
export const deleteResource = (id: number) => deleteById(TABLE, id)

export async function createResource(input: CreateResourceInput): Promise<ResourceRow> {
  const { rows } = await pool.query<ResourceRow>(
    `INSERT INTO resources (event_id, area_id, resource_type_id, label, total_quantity, attributes)
     VALUES ($1, $2, $3, $4, COALESCE($5,0), COALESCE($6,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_id, input.area_id ?? null, input.resource_type_id,
      input.label ?? null, input.total_quantity ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}
