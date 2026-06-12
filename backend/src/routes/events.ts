import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import * as service from '../services/events.service.js'

const router = Router()

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM')

const createSchema = z.object({
  event_type_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  timezone: z.string().optional(),
  start_date: dateString.optional(),
  end_date: dateString.optional(),
  is_active: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  subtitle: z.string().max(255).optional(),
  location_address: z.string().optional(),
  capacity: z.number().int().nonnegative().optional(),
  start_time: timeString.optional(),
  end_time: timeString.optional(),
  hero_image_url: z.url().max(2048).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  apply_template: z.boolean().optional(), // provision default resource types/pricing (default true)
})

const updateSchema = createSchema.partial().extend({
  is_featured: z.boolean().optional(),
  subtitle: z.string().max(255).nullable().optional(),
  location_address: z.string().nullable().optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  start_time: timeString.nullable().optional(),
  end_time: timeString.nullable().optional(),
  hero_image_url: z.url().max(2048).nullable().optional(),
})

function parseId(raw: string | undefined): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid id')
  return id
}

router.get('/', requireActivatedAccount(), requirePermission('events', 'viewAll'), async (_req, res) => {
  res.json(await service.listEvents())
})

router.get('/current', requireActivatedAccount(), requirePermission('events', 'viewCurrent'), async (_req, res) => {
  res.json(await service.getCurrentEvent())
})

router.get('/:id/stats', requireActivatedAccount(), requirePermission('events', 'viewAll'), async (req, res) => {
  res.json(await service.getEventStats(parseId(req.params.id)))
})

router.get('/:id/pipeline', requireActivatedAccount(), requirePermission('events', 'viewCurrent'), async (req, res) => {
  res.json(await service.getPipelineStages(parseId(req.params.id)))
})

router.get('/:id/finance', requireActivatedAccount(), requirePermission('finance', 'view'), async (req, res) => {
  res.json(await service.getEventFinance(parseId(req.params.id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('events', 'viewAll'), async (req, res) => {
  res.json(await service.getEvent(parseId(req.params.id)))
})

router.post('/', requireActivatedAccount(), requirePermission('events', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await service.createEvent(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('events', 'update'), validateBody(updateSchema), async (req, res) => {
  res.json(await service.updateEvent(parseId(req.params.id), req.body))
})

router.patch('/:id/set-current', requireActivatedAccount(), requirePermission('events', 'setCurrent'), async (req, res) => {
  res.json(await service.setCurrentEvent(parseId(req.params.id)))
})

router.patch('/:id/set-featured', requireActivatedAccount(), requirePermission('events', 'setFeatured'), async (req, res) => {
  res.json(await service.setFeaturedEvent(parseId(req.params.id)))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('events', 'delete'), async (req, res) => {
  await service.deleteEvent(parseId(req.params.id))
  res.json({ message: 'Event deleted' })
})

export default router
