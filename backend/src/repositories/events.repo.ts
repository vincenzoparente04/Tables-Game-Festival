import pool from '../db/database.js'

export interface EventRow {
  id: number
  event_type_id: number
  name: string
  slug: string | null
  description: string | null
  venue: string | null
  timezone: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  is_current: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateEventInput {
  event_type_id: number
  name: string
  slug?: string
  description?: string
  venue?: string
  timezone?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
  settings?: Record<string, unknown>
}

export type UpdateEventInput = Partial<CreateEventInput>

// Columns that may be set via create/update (whitelist — never user-controlled).
const UPDATABLE = [
  'event_type_id', 'name', 'slug', 'description', 'venue',
  'timezone', 'start_date', 'end_date', 'is_active', 'settings',
] as const

export async function listEvents(): Promise<EventRow[]> {
  const { rows } = await pool.query<EventRow>(
    'SELECT * FROM events ORDER BY start_date DESC NULLS LAST, id DESC',
  )
  return rows
}

export async function getEventById(id: number): Promise<EventRow | null> {
  const { rows } = await pool.query<EventRow>('SELECT * FROM events WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function getCurrentEvent(): Promise<EventRow | null> {
  const { rows } = await pool.query<EventRow>('SELECT * FROM events WHERE is_current LIMIT 1')
  return rows[0] ?? null
}

export async function eventTypeExists(id: number): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM event_types WHERE id = $1', [id])
  return rows.length > 0
}

export async function getEventTypeKey(id: number): Promise<string | null> {
  const { rows } = await pool.query<{ key: string }>('SELECT key FROM event_types WHERE id = $1', [id])
  return rows[0]?.key ?? null
}

export interface PipelineStageRow {
  id: number
  key: string
  label: string
  position: number
  is_terminal: boolean
}

// Workflow stages available for a given event (resolved via its event type).
export async function getPipelineStagesForEvent(eventId: number): Promise<PipelineStageRow[]> {
  const { rows } = await pool.query<PipelineStageRow>(
    `SELECT ps.id, ps.key, ps.label, ps.position, ps.is_terminal
       FROM pipeline_stages ps
       JOIN events e ON e.event_type_id = ps.event_type_id
      WHERE e.id = $1
      ORDER BY ps.position`,
    [eventId],
  )
  return rows
}

export async function createEvent(input: CreateEventInput): Promise<EventRow> {
  const { rows } = await pool.query<EventRow>(
    `INSERT INTO events
       (event_type_id, name, slug, description, venue, timezone, start_date, end_date, is_active, settings)
     VALUES ($1,$2,$3,$4,$5, COALESCE($6,'UTC'), $7,$8, COALESCE($9,true), COALESCE($10,'{}'::jsonb))
     RETURNING *`,
    [
      input.event_type_id, input.name, input.slug ?? null, input.description ?? null,
      input.venue ?? null, input.timezone ?? null, input.start_date ?? null,
      input.end_date ?? null, input.is_active ?? null, input.settings ?? null,
    ],
  )
  return rows[0]!
}

export async function updateEvent(id: number, input: UpdateEventInput): Promise<EventRow | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let i = 1
  for (const key of UPDATABLE) {
    const value = input[key]
    if (value !== undefined) {
      sets.push(`${key} = $${i++}`)
      values.push(value)
    }
  }
  if (sets.length === 0) return getEventById(id)
  values.push(id)
  const { rows } = await pool.query<EventRow>(
    `UPDATE events SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  )
  return rows[0] ?? null
}

export async function deleteEvent(id: number): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM events WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}

// Marks one event as current; only one event may be current at a time.
export async function setCurrentEvent(id: number): Promise<EventRow | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const exists = await client.query('SELECT 1 FROM events WHERE id = $1', [id])
    if (exists.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }
    await client.query('UPDATE events SET is_current = false WHERE is_current')
    const { rows } = await client.query<EventRow>(
      'UPDATE events SET is_current = true WHERE id = $1 RETURNING *',
      [id],
    )
    await client.query('COMMIT')
    return rows[0] ?? null
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
