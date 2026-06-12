import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/venue-maps.service.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

export const ELEMENT_KINDS = [
  'stage', 'stand', 'table', 'booth', 'bar', 'food', 'entrance', 'exit', 'wc',
  'seating', 'info', 'decor', 'custom',
] as const

const createSchema = z.object({
  event_id: z.number().int().positive(),
  name: z.string().min(1).max(150),
  template_key: z.string().max(50).optional(),
  width: z.number().positive().max(100000).optional(),
  height: z.number().positive().max(100000).optional(),
  background: z.array(jsonObject).max(200).optional(),
  settings: jsonObject.optional(),
  is_public: z.boolean().optional(),
})
const updateSchema = createSchema.omit({ event_id: true, template_key: true }).partial()

const elementSchema = z.object({
  kind: z.enum(ELEMENT_KINDS),
  label: z.string().max(150).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().max(100000).optional(),
  height: z.number().positive().max(100000).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  capacity: z.number().int().nonnegative().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Expected a hex color').optional(),
  z_index: z.number().int().optional(),
  area_id: z.number().int().positive().optional(),
  resource_id: z.number().int().positive().optional(),
  booking_id: z.number().int().positive().optional(),
  attributes: jsonObject.optional(),
})
// 500 elements ≈ 100kB of JSON — comfortably inside the 1mb body limit.
const replaceElementsSchema = z.object({ elements: z.array(elementSchema).max(500) })

router.get('/', requireActivatedAccount(), requirePermission('venueMaps', 'view'), async (req, res) => {
  res.json(await service.listMaps(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('venueMaps', 'view'), async (req, res) => {
  res.json(await service.getMapDetail(parseId(req.params.id)))
})

router.post('/', requireActivatedAccount(), requirePermission('venueMaps', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await service.createMap(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('venueMaps', 'update'), validateBody(updateSchema), async (req, res) => {
  res.json(await service.updateMap(parseId(req.params.id), req.body))
})

router.put('/:id/elements', requireActivatedAccount(), requirePermission('venueMaps', 'update'), validateBody(replaceElementsSchema), async (req, res) => {
  res.json(await service.replaceElements(parseId(req.params.id), req.body.elements))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('venueMaps', 'delete'), async (req, res) => {
  await service.deleteMap(parseId(req.params.id))
  res.json({ message: 'Venue map deleted' })
})

export default router
