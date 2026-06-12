import pool from '../db/database.js'
import { deleteById, findById, updateById } from './crud.js'

export interface VenueMapRow {
  id: number
  event_id: number
  name: string
  template_key: string | null
  width: number
  height: number
  background: unknown[]
  settings: Record<string, unknown>
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface MapElementRow {
  id: number
  venue_map_id: number
  kind: string
  label: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  capacity: number | null
  color: string | null
  z_index: number
  area_id: number | null
  resource_id: number | null
  booking_id: number | null
  attributes: Record<string, unknown>
  created_at: string
}

// Elements with their linked entities resolved to display names.
export interface MapElementDetailRow extends MapElementRow {
  area_name: string | null
  resource_label: string | null
  booking_participant_name: string | null
}

export interface CreateVenueMapInput {
  event_id: number
  name: string
  template_key?: string
  width?: number
  height?: number
  background?: unknown[]
  settings?: Record<string, unknown>
  is_public?: boolean
}

export interface UpdateVenueMapInput {
  name?: string
  width?: number
  height?: number
  background?: unknown[]
  settings?: Record<string, unknown>
  is_public?: boolean
}

export interface MapElementInput {
  kind: string
  label?: string
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  capacity?: number
  color?: string
  z_index?: number
  area_id?: number
  resource_id?: number
  booking_id?: number
  attributes?: Record<string, unknown>
}

export interface CapacityByKind {
  kind: string
  count: number
  capacity: number
}

const TABLE = 'venue_maps'
const UPDATABLE = ['name', 'width', 'height', 'background', 'settings', 'is_public'] as const

export async function listVenueMaps(eventId?: number): Promise<VenueMapRow[]> {
  const { rows } = await pool.query<VenueMapRow>(
    `SELECT * FROM venue_maps
      WHERE ($1::int IS NULL OR event_id = $1)
      ORDER BY event_id, id`,
    [eventId ?? null],
  )
  return rows
}

export const getVenueMap = (id: number) => findById<VenueMapRow>(TABLE, id)
export const updateVenueMap = (id: number, input: UpdateVenueMapInput) =>
  updateById<VenueMapRow>(TABLE, UPDATABLE, id, input as Record<string, unknown>)
export const deleteVenueMap = (id: number) => deleteById(TABLE, id)

export async function createVenueMap(input: CreateVenueMapInput): Promise<VenueMapRow> {
  const { rows } = await pool.query<VenueMapRow>(
    `INSERT INTO venue_maps (event_id, name, template_key, width, height, background, settings, is_public)
     VALUES ($1, $2, $3, COALESCE($4,1200), COALESCE($5,800),
             COALESCE($6,'[]'::jsonb), COALESCE($7,'{}'::jsonb), COALESCE($8,true))
     RETURNING *`,
    [
      input.event_id, input.name, input.template_key ?? null,
      input.width ?? null, input.height ?? null,
      input.background !== undefined ? JSON.stringify(input.background) : null,
      input.settings ?? null, input.is_public ?? null,
    ],
  )
  return rows[0]!
}

export async function listMapElements(mapId: number): Promise<MapElementDetailRow[]> {
  const { rows } = await pool.query<MapElementDetailRow>(
    `SELECT me.*, a.name AS area_name, r.label AS resource_label, p.name AS booking_participant_name
       FROM map_elements me
       LEFT JOIN areas a ON a.id = me.area_id
       LEFT JOIN resources r ON r.id = me.resource_id
       LEFT JOIN bookings b ON b.id = me.booking_id
       LEFT JOIN participants p ON p.id = b.participant_id
      WHERE me.venue_map_id = $1
      ORDER BY me.z_index, me.id`,
    [mapId],
  )
  return rows
}

// Guest-capacity totals per element kind (NULL capacities count as 0).
export async function getCapacityByKind(mapId: number): Promise<CapacityByKind[]> {
  const { rows } = await pool.query<CapacityByKind>(
    `SELECT kind, COUNT(*)::int AS count, COALESCE(SUM(capacity), 0)::int AS capacity
       FROM map_elements
      WHERE venue_map_id = $1
      GROUP BY kind
      ORDER BY kind`,
    [mapId],
  )
  return rows
}

// Replaces ALL elements of a map atomically (the editor saves the full state).
export async function replaceMapElements(
  mapId: number,
  elements: MapElementInput[],
): Promise<MapElementRow[]> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM map_elements WHERE venue_map_id = $1', [mapId])
    const inserted: MapElementRow[] = []
    for (const el of elements) {
      const { rows } = await client.query<MapElementRow>(
        `INSERT INTO map_elements
           (venue_map_id, kind, label, x, y, width, height, rotation, capacity, color, z_index,
            area_id, resource_id, booking_id, attributes)
         VALUES ($1, $2, $3, COALESCE($4,0), COALESCE($5,0), COALESCE($6,80), COALESCE($7,60),
                 COALESCE($8,0), $9, $10, COALESCE($11,0), $12, $13, $14, COALESCE($15,'{}'::jsonb))
         RETURNING *`,
        [
          mapId, el.kind, el.label ?? null, el.x ?? null, el.y ?? null,
          el.width ?? null, el.height ?? null, el.rotation ?? null,
          el.capacity ?? null, el.color ?? null, el.z_index ?? null,
          el.area_id ?? null, el.resource_id ?? null, el.booking_id ?? null,
          el.attributes ?? null,
        ],
      )
      inserted.push(rows[0]!)
    }
    await client.query('COMMIT')
    return inserted
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Ids (from the given list) that exist in the table AND belong to the event.
async function idsInEvent(table: 'areas' | 'resources' | 'bookings', ids: number[], eventId: number): Promise<Set<number>> {
  if (ids.length === 0) return new Set()
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM ${table} WHERE id = ANY($1::int[]) AND event_id = $2`,
    [ids, eventId],
  )
  return new Set(rows.map((r) => r.id))
}

export const areaIdsInEvent = (ids: number[], eventId: number) => idsInEvent('areas', ids, eventId)
export const resourceIdsInEvent = (ids: number[], eventId: number) => idsInEvent('resources', ids, eventId)
export const bookingIdsInEvent = (ids: number[], eventId: number) => idsInEvent('bookings', ids, eventId)
