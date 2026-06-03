import pool from '../db/database.js'
import { deleteById, findById, listByEvent, updateById } from './crud.js'

export interface ParticipantRow {
  id: number
  event_id: number
  participant_type: string
  name: string
  external_ref: string | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ParticipantContactRow {
  id: number
  participant_id: number
  name: string
  email: string | null
  phone: string | null
  role: string | null
  created_at: string
}

export interface CreateParticipantInput {
  event_id: number
  participant_type?: string
  name: string
  external_ref?: string
  attributes?: Record<string, unknown>
}

export type UpdateParticipantInput = Partial<Omit<CreateParticipantInput, 'event_id'>>

export interface ContactInput {
  name: string
  email?: string
  phone?: string
  role?: string
}

const TABLE = 'participants'
const UPDATABLE = ['participant_type', 'name', 'external_ref', 'attributes'] as const

export const listParticipants = (eventId?: number) => listByEvent<ParticipantRow>(TABLE, eventId)
export const getParticipant = (id: number) => findById<ParticipantRow>(TABLE, id)
export const updateParticipant = (id: number, input: UpdateParticipantInput) =>
  updateById<ParticipantRow>(TABLE, UPDATABLE, id, input)
export const deleteParticipant = (id: number) => deleteById(TABLE, id)

export async function createParticipant(input: CreateParticipantInput): Promise<ParticipantRow> {
  const { rows } = await pool.query<ParticipantRow>(
    `INSERT INTO participants (event_id, participant_type, name, external_ref, attributes)
     VALUES ($1, COALESCE($2,'exhibitor'), $3, $4, COALESCE($5,'{}'::jsonb))
     RETURNING *`,
    [input.event_id, input.participant_type ?? null, input.name, input.external_ref ?? null, input.attributes ?? null],
  )
  return rows[0]!
}

export async function listContacts(participantId: number): Promise<ParticipantContactRow[]> {
  const { rows } = await pool.query<ParticipantContactRow>(
    'SELECT * FROM participant_contacts WHERE participant_id = $1 ORDER BY id',
    [participantId],
  )
  return rows
}

export async function addContact(participantId: number, input: ContactInput): Promise<ParticipantContactRow> {
  const { rows } = await pool.query<ParticipantContactRow>(
    `INSERT INTO participant_contacts (participant_id, name, email, phone, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [participantId, input.name, input.email ?? null, input.phone ?? null, input.role ?? null],
  )
  return rows[0]!
}

export async function deleteContact(participantId: number, contactId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM participant_contacts WHERE id = $1 AND participant_id = $2',
    [contactId, participantId],
  )
  return (rowCount ?? 0) > 0
}
