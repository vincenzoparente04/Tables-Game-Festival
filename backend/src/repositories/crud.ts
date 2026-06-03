import type { QueryResultRow } from 'pg'
import pool from '../db/database.js'

// Small shared helpers for simple CRUD repositories.
// `table` and `allowed` are always hardcoded literals in our repos (never user
// input), so interpolating them here is safe.

export async function findById<Row extends QueryResultRow>(
    table: string,
    id: number,
): Promise<Row | null> {
    const { rows } = await pool.query<Row>(`SELECT * FROM ${table} WHERE id = $1`, [id])
    return rows[0] ?? null
}

export async function listAll<Row extends QueryResultRow>(
    table: string,
    orderBy = 'id',
): Promise<Row[]> {
    const { rows } = await pool.query<Row>(`SELECT * FROM ${table} ORDER BY ${orderBy}`)
    return rows
}

export async function listByEvent<Row extends QueryResultRow>(
    table: string,
    eventId: number | undefined,
): Promise<Row[]> {
    if (eventId === undefined) {
        const { rows } = await pool.query<Row>(`SELECT * FROM ${table} ORDER BY id`)
        return rows
    }
    const { rows } = await pool.query<Row>(
        `SELECT * FROM ${table} WHERE event_id = $1 ORDER BY id`,
        [eventId],
    )
    return rows
}

export async function updateById<Row extends QueryResultRow>(
    table: string,
    allowed: readonly string[],
    id: number,
    input: Record<string, unknown>,
): Promise<Row | null> {
    const sets: string[] = []
    const values: unknown[] = []
    let i = 1
    for (const key of allowed) {
        if (input[key] !== undefined) {
            sets.push(`${key} = $${i++}`)
            values.push(input[key])
        }
    }
    if (sets.length === 0) return findById<Row>(table, id)
    values.push(id)
    const { rows } = await pool.query<Row>(
        `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        values,
    )
    return rows[0] ?? null
}

export async function deleteById(table: string, id: number): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id])
    return (rowCount ?? 0) > 0
}
