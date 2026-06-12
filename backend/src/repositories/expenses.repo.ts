import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface ExpenseRow {
  id: number
  event_id: number
  booking_id: number | null
  participant_id: number | null
  category: string
  description: string
  amount: string
  status: string
  due_date: string | null
  paid_at: string | null
  supplier_invoice_ref: string | null
  attachment_url: string | null
  attributes: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ExpenseListRow extends ExpenseRow {
  participant_name: string | null
}

export interface CreateExpenseInput {
  event_id: number
  booking_id?: number
  participant_id?: number
  category?: string
  description: string
  amount: number
  status?: string
  due_date?: string
  paid_at?: string
  supplier_invoice_ref?: string
  attachment_url?: string
  attributes?: Record<string, unknown>
}

export interface UpdateExpenseInput {
  booking_id?: number | null
  participant_id?: number | null
  category?: string
  description?: string
  amount?: number
  status?: string
  due_date?: string | null
  paid_at?: string | null
  supplier_invoice_ref?: string | null
  attachment_url?: string | null
  attributes?: Record<string, unknown>
}

const TABLE = 'expenses'
const UPDATABLE = [
  'booking_id', 'participant_id', 'category', 'description', 'amount', 'status',
  'due_date', 'paid_at', 'supplier_invoice_ref', 'attachment_url', 'attributes',
] as const

export async function listExpenses(
  eventId?: number,
  status?: string,
  category?: string,
): Promise<ExpenseListRow[]> {
  const { rows } = await pool.query<ExpenseListRow>(
    `SELECT e.*, p.name AS participant_name
       FROM expenses e
       LEFT JOIN participants p ON p.id = e.participant_id
      WHERE ($1::int IS NULL OR e.event_id = $1)
        AND ($2::text IS NULL OR e.status = $2)
        AND ($3::text IS NULL OR e.category = $3)
      ORDER BY e.due_date NULLS LAST, e.id`,
    [eventId ?? null, status ?? null, category ?? null],
  )
  return rows
}

export const getExpense = (id: number) => findById<ExpenseRow>(TABLE, id)
export const updateExpense = (id: number, input: UpdateExpenseInput) =>
  updateById<ExpenseRow>(TABLE, UPDATABLE, id, input as Record<string, unknown>)
export const deleteExpense = (id: number) => deleteById(TABLE, id)

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  const { rows } = await pool.query<ExpenseRow>(
    `INSERT INTO expenses
       (event_id, booking_id, participant_id, category, description, amount, status,
        due_date, paid_at, supplier_invoice_ref, attachment_url, attributes)
     VALUES ($1, $2, $3, COALESCE($4,'other'), $5, $6, COALESCE($7,'planned'),
             $8, $9, $10, $11, COALESCE($12,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_id, input.booking_id ?? null, input.participant_id ?? null,
      input.category ?? null, input.description, input.amount, input.status ?? null,
      input.due_date ?? null, input.paid_at ?? null, input.supplier_invoice_ref ?? null,
      input.attachment_url ?? null, input.attributes ?? null,
    ],
  )
  return rows[0]!
}
