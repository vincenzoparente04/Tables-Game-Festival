import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/events.repo.js'
import type { CreateEventInput, EventRow, UpdateEventInput } from '../repositories/events.repo.js'
import * as resourceTypesRepo from '../repositories/resource-types.repo.js'
import * as pricingRepo from '../repositories/pricing-tiers.repo.js'
import { getEventTemplate } from './event-templates.js'

export { getEventStats } from '../repositories/stats.repo.js'

export function listEvents(): Promise<EventRow[]> {
  return repo.listEvents()
}

export function getCurrentEvent(): Promise<EventRow | null> {
  return repo.getCurrentEvent()
}

export function getPipelineStages(eventId: number) {
  return repo.getPipelineStagesForEvent(eventId)
}

export async function getEvent(id: number): Promise<EventRow> {
  const event = await repo.getEventById(id)
  if (!event) throw new AppError(404, 'Event not found')
  return event
}

export async function createEvent(
  input: CreateEventInput & { apply_template?: boolean },
): Promise<EventRow> {
  if (!(await repo.eventTypeExists(input.event_type_id))) {
    throw new AppError(400, 'Unknown event type')
  }
  const event = await repo.createEvent(input)

  // Provision sensible starter resource types + pricing for the event type.
  // These are fully editable afterwards (no locked preset).
  if (input.apply_template !== false) {
    const typeKey = await repo.getEventTypeKey(input.event_type_id)
    const template = typeKey ? getEventTemplate(typeKey) : null
    if (template) {
      const resourceTypeIdByKey = new Map<string, number>()
      for (const rt of template.resource_types) {
        const created = await resourceTypesRepo.createResourceType({
          event_id: event.id,
          key: rt.key,
          label: rt.label,
          unit: rt.unit,
        })
        resourceTypeIdByKey.set(rt.key, created.id)
      }
      for (const pt of template.pricing_tiers ?? []) {
        const resourceTypeId = resourceTypeIdByKey.get(pt.resource_type_key)
        if (resourceTypeId === undefined) continue
        await pricingRepo.createPricingTier({
          event_id: event.id,
          name: pt.name,
          resource_type_id: resourceTypeId,
          ...(pt.unit_price !== undefined ? { unit_price: pt.unit_price } : {}),
          ...(pt.price_per_sqm !== undefined ? { price_per_sqm: pt.price_per_sqm } : {}),
        })
      }
    }
  }

  return event
}

export async function updateEvent(id: number, input: UpdateEventInput): Promise<EventRow> {
  if (input.event_type_id !== undefined && !(await repo.eventTypeExists(input.event_type_id))) {
    throw new AppError(400, 'Unknown event type')
  }
  const event = await repo.updateEvent(id, input)
  if (!event) throw new AppError(404, 'Event not found')
  return event
}

export async function deleteEvent(id: number): Promise<void> {
  const deleted = await repo.deleteEvent(id)
  if (!deleted) throw new AppError(404, 'Event not found')
}

export async function setCurrentEvent(id: number): Promise<EventRow> {
  const event = await repo.setCurrentEvent(id)
  if (!event) throw new AppError(404, 'Event not found')
  return event
}
