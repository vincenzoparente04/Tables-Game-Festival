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
  status: string
  is_featured: boolean
  hero_image_url: string | null
  subtitle: string | null
  location_address: string | null
  capacity: number | null
  start_time: string | null
  end_time: string | null
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
  status?: string
  subtitle?: string
  location_address?: string
  capacity?: number
  start_time?: string
  end_time?: string
  hero_image_url?: string
  settings?: Record<string, unknown>
}

export type UpdateEventInput = Partial<CreateEventInput> & {
  is_featured?: boolean
  hero_image_url?: string | null
  subtitle?: string | null
  location_address?: string | null
  capacity?: number | null
  start_time?: string | null
  end_time?: string | null
}

// Columns that may be set via create/update (whitelist — never user-controlled).
const UPDATABLE = [
  'event_type_id', 'name', 'slug', 'description', 'venue',
  'timezone', 'start_date', 'end_date', 'is_active', 'settings',
  'status', 'is_featured', 'hero_image_url', 'subtitle', 'location_address',
  'capacity', 'start_time', 'end_time',
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
       (event_type_id, name, slug, description, venue, timezone, start_date, end_date, is_active, settings,
        status, subtitle, location_address, capacity, start_time, end_time, hero_image_url)
     VALUES ($1,$2,$3,$4,$5, COALESCE($6,'UTC'), $7,$8, COALESCE($9,true), COALESCE($10,'{}'::jsonb),
             COALESCE($11,'draft'), $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      input.event_type_id, input.name, input.slug ?? null, input.description ?? null,
      input.venue ?? null, input.timezone ?? null, input.start_date ?? null,
      input.end_date ?? null, input.is_active ?? null, input.settings ?? null,
      input.status ?? null, input.subtitle ?? null, input.location_address ?? null,
      input.capacity ?? null, input.start_time ?? null, input.end_time ?? null,
      input.hero_image_url ?? null,
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
  // tickets.ticket_type_id is ON DELETE RESTRICT, which would abort the
  // event → ticket_types cascade as long as sold tickets still exist. Remove
  // the event's tickets first; everything else cascades from events.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM tickets WHERE order_id IN (SELECT id FROM orders WHERE event_id = $1)',
      [id],
    )
    const { rowCount } = await client.query('DELETE FROM events WHERE id = $1', [id])
    await client.query('COMMIT')
    return (rowCount ?? 0) > 0
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
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

export async function slugExists(slug: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM events WHERE slug = $1', [slug])
  return rows.length > 0
}

// Marks one event as featured on the public site; at most one at a time.
export async function setFeaturedEvent(id: number): Promise<EventRow | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const exists = await client.query('SELECT 1 FROM events WHERE id = $1', [id])
    if (exists.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }
    await client.query('UPDATE events SET is_featured = false WHERE is_featured')
    const { rows } = await client.query<EventRow>(
      'UPDATE events SET is_featured = true WHERE id = $1 RETURNING *',
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
