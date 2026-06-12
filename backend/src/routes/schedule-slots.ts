import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/schedule.service.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())
const isoDatetime = z.iso.datetime({ offset: true })

const SLOT_KINDS = ['performance', 'exhibition', 'talk', 'workshop', 'screening', 'other'] as const
const SLOT_STATUSES = ['tentative', 'confirmed', 'cancelled'] as const

const createSchema = z.object({
  event_id: z.number().int().positive(),
  area_id: z.number().int().positive().optional(),
  artist_id: z.number().int().positive().optional(),
  booking_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  kind: z.enum(SLOT_KINDS).optional(),
  starts_at: isoDatetime,
  ends_at: isoDatetime,
  status: z.enum(SLOT_STATUSES).optional(),
  is_public: z.boolean().optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial().extend({
  area_id: z.number().int().positive().nullable().optional(),
  artist_id: z.number().int().positive().nullable().optional(),
  booking_id: z.number().int().positive().nullable().optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('schedule', 'view'), async (req, res) => {
  res.json(await service.listSlots(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('schedule', 'view'), async (req, res) => {
  res.json(await service.getSlot(parseId(req.params.id)))
})

router.post('/', requireActivatedAccount(), requirePermission('schedule', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await service.createSlot(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('schedule', 'update'), validateBody(updateSchema), async (req, res) => {
  res.json(await service.updateSlot(parseId(req.params.id), req.body))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('schedule', 'delete'), async (req, res) => {
  await service.deleteSlot(parseId(req.params.id))
  res.json({ message: 'Schedule slot deleted' })
})

export default router
