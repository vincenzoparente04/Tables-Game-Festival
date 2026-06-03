import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/resources.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const createSchema = z.object({
  event_id: z.number().int().positive(),
  resource_type_id: z.number().int().positive(),
  area_id: z.number().int().positive().optional(),
  label: z.string().max(150).optional(),
  total_quantity: z.number().int().nonnegative().optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial()

router.get('/', requireActivatedAccount(), requirePermission('resources', 'view'), async (req, res) => {
  res.json(await repo.listResources(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('resources', 'view'), async (req, res) => {
  const row = await repo.getResource(parseId(req.params.id))
  if (!row) throw new AppError(404, 'Resource not found')
  res.json(row)
})

router.post('/', requireActivatedAccount(), requirePermission('resources', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createResource(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('resources', 'update'), validateBody(updateSchema), async (req, res) => {
  const row = await repo.updateResource(parseId(req.params.id), req.body)
  if (!row) throw new AppError(404, 'Resource not found')
  res.json(row)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('resources', 'delete'), async (req, res) => {
  if (!(await repo.deleteResource(parseId(req.params.id)))) throw new AppError(404, 'Resource not found')
  res.json({ message: 'Resource deleted' })
})

export default router
