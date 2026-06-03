import pool from '../db/database.js'
import { deleteById, findById, listAll, updateById } from './crud.js'

export interface PublisherRow {
  id: number
  name: string
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePublisherInput {
  name: string
  attributes?: Record<string, unknown>
}

export type UpdatePublisherInput = Partial<CreatePublisherInput>

const TABLE = 'publishers'
const UPDATABLE = ['name', 'attributes'] as const

export const listPublishers = () => listAll<PublisherRow>(TABLE, 'name')
export const getPublisher = (id: number) => findById<PublisherRow>(TABLE, id)
export const updatePublisher = (id: number, input: UpdatePublisherInput) =>
  updateById<PublisherRow>(TABLE, UPDATABLE, id, input)
export const deletePublisher = (id: number) => deleteById(TABLE, id)

export async function createPublisher(input: CreatePublisherInput): Promise<PublisherRow> {
  const { rows } = await pool.query<PublisherRow>(
    `INSERT INTO publishers (name, attributes) VALUES ($1, COALESCE($2,'{}'::jsonb)) RETURNING *`,
    [input.name, input.attributes ?? null],
  )
  return rows[0]!
}
