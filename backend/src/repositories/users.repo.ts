import pool from '../db/database.js'
import { deleteById } from './crud.js'

// A user without the password hash (safe to return over the API).
export interface SafeUserRow {
  id: number
  first_name: string | null
  last_name: string | null
  email: string
  login: string
  role: string
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  first_name?: string
  last_name?: string
  email: string
  login: string
  password_hash: string
  role: string
}

const COLS = 'id, first_name, last_name, email, login, role, created_at, updated_at'

export async function listUsers(): Promise<SafeUserRow[]> {
  const { rows } = await pool.query<SafeUserRow>(`SELECT ${COLS} FROM users ORDER BY created_at DESC`)
  return rows
}

export async function listPendingUsers(): Promise<SafeUserRow[]> {
  const { rows } = await pool.query<SafeUserRow>(
    `SELECT ${COLS} FROM users WHERE role = 'user' ORDER BY created_at DESC`,
  )
  return rows
}

export async function createUser(input: CreateUserInput): Promise<SafeUserRow> {
  const { rows } = await pool.query<SafeUserRow>(
    `INSERT INTO users (first_name, last_name, email, login, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
    [input.first_name ?? null, input.last_name ?? null, input.email, input.login, input.password_hash, input.role],
  )
  return rows[0]!
}

export async function updateUserRole(id: number, role: string): Promise<SafeUserRow | null> {
  const { rows } = await pool.query<SafeUserRow>(
    `UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING ${COLS}`,
    [role, id],
  )
  return rows[0] ?? null
}

export const deleteUser = (id: number) => deleteById('users', id)
