import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/venue-maps.repo.js'
import type {
  CapacityByKind, CreateVenueMapInput, MapElementDetailRow, MapElementInput,
  UpdateVenueMapInput, VenueMapRow,
} from '../repositories/venue-maps.repo.js'
import { getEventById } from '../repositories/events.repo.js'
import { getVenueTemplate } from './venue-templates.js'

export interface CapacitySummary {
  total: number
  by_kind: CapacityByKind[]
}

export interface VenueMapDetail extends VenueMapRow {
  elements: MapElementDetailRow[]
  capacity_summary: CapacitySummary
}

export function listMaps(eventId?: number): Promise<VenueMapRow[]> {
  return repo.listVenueMaps(eventId)
}

async function getMapOr404(id: number): Promise<VenueMapRow> {
  const map = await repo.getVenueMap(id)
  if (!map) throw new AppError(404, 'Venue map not found')
  return map
}

async function capacitySummary(mapId: number): Promise<CapacitySummary> {
  const byKind = await repo.getCapacityByKind(mapId)
  return { total: byKind.reduce((sum, k) => sum + k.capacity, 0), by_kind: byKind }
}

export async function getMapDetail(id: number): Promise<VenueMapDetail> {
  const map = await getMapOr404(id)
  const [elements, summary] = await Promise.all([repo.listMapElements(id), capacitySummary(id)])
  return { ...map, elements, capacity_summary: summary }
}

// Creating from a template copies its canvas size and background shapes;
// explicit width/height/background in the input win over the template.
export async function createMap(input: CreateVenueMapInput): Promise<VenueMapRow> {
  if (!(await getEventById(input.event_id))) throw new AppError(400, 'Unknown event')
  let create = input
  if (input.template_key !== undefined) {
    const template = getVenueTemplate(input.template_key)
    if (!template) throw new AppError(400, 'Unknown venue template')
    create = {
      ...input,
      width: input.width ?? template.canvas.width,
      height: input.height ?? template.canvas.height,
      background: input.background ?? (template.background as unknown[]),
    }
  }
  return repo.createVenueMap(create)
}

export async function updateMap(id: number, input: UpdateVenueMapInput): Promise<VenueMapRow> {
  const map = await repo.updateVenueMap(id, input)
  if (!map) throw new AppError(404, 'Venue map not found')
  return map
}

export async function deleteMap(id: number): Promise<void> {
  if (!(await repo.deleteVenueMap(id))) throw new AppError(404, 'Venue map not found')
}

function uniqueIds(elements: MapElementInput[], key: 'area_id' | 'resource_id' | 'booking_id'): number[] {
  return [...new Set(elements.map((el) => el[key]).filter((id): id is number => id != null))]
}

export async function replaceElements(mapId: number, elements: MapElementInput[]): Promise<VenueMapDetail> {
  const map = await getMapOr404(mapId)

  // Every linked entity must exist and belong to the map's event.
  const [validAreas, validResources, validBookings] = await Promise.all([
    repo.areaIdsInEvent(uniqueIds(elements, 'area_id'), map.event_id),
    repo.resourceIdsInEvent(uniqueIds(elements, 'resource_id'), map.event_id),
    repo.bookingIdsInEvent(uniqueIds(elements, 'booking_id'), map.event_id),
  ])
  for (const el of elements) {
    if (el.area_id != null && !validAreas.has(el.area_id)) {
      throw new AppError(400, 'Linked area does not belong to this event')
    }
    if (el.resource_id != null && !validResources.has(el.resource_id)) {
      throw new AppError(400, 'Linked resource does not belong to this event')
    }
    if (el.booking_id != null && !validBookings.has(el.booking_id)) {
      throw new AppError(400, 'Linked booking does not belong to this event')
    }
  }

  await repo.replaceMapElements(mapId, elements)
  return getMapDetail(mapId)
}
