import pool from '../db/database.js'
import { deleteById, findById, listAll, updateById } from './crud.js'

export interface AuthorRow {
  id: number
  first_name: string | null
  last_name: string
  created_at: string
}

export interface CreateAuthorInput {
  first_name?: string
  last_name: string
}

export type UpdateAuthorInput = Partial<CreateAuthorInput>

const TABLE = 'authors'
const UPDATABLE = ['first_name', 'last_name'] as const

export const listAuthors = () => listAll<AuthorRow>(TABLE, 'last_name')
export const getAuthor = (id: number) => findById<AuthorRow>(TABLE, id)
export const updateAuthor = (id: number, input: UpdateAuthorInput) =>
  updateById<AuthorRow>(TABLE, UPDATABLE, id, input)
export const deleteAuthor = (id: number) => deleteById(TABLE, id)

export async function createAuthor(input: CreateAuthorInput): Promise<AuthorRow> {
  const { rows } = await pool.query<AuthorRow>(
    `INSERT INTO authors (first_name, last_name) VALUES ($1, $2) RETURNING *`,
    [input.first_name ?? null, input.last_name],
  )
  return rows[0]!
}
