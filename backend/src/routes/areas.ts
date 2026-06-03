import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/areas.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const createSchema = z.object({
  event_id: z.number().int().positive(),
  name: z.string().min(1).max(150),
  kind: z.string().max(50).optional(),
  capacity: z.number().int().nonnegative().optional(),
  layout: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial()

router.get('/', requireActivatedAccount(), requirePermission('areas', 'view'), async (req, res) => {
  res.json(await repo.listAreas(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('areas', 'view'), async (req, res) => {
  const area = await repo.getArea(parseId(req.params.id))
  if (!area) throw new AppError(404, 'Area not found')
  res.json(area)
})

router.post('/', requireActivatedAccount(), requirePermission('areas', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createArea(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('areas', 'update'), validateBody(updateSchema), async (req, res) => {
  const area = await repo.updateArea(parseId(req.params.id), req.body)
  if (!area) throw new AppError(404, 'Area not found')
  res.json(area)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('areas', 'delete'), async (req, res) => {
  if (!(await repo.deleteArea(parseId(req.params.id)))) throw new AppError(404, 'Area not found')
  res.json({ message: 'Area deleted' })
})

export default router
