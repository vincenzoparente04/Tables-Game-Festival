import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/resource-types.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const createSchema = z.object({
  event_id: z.number().int().positive().optional(),
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(150),
  unit: z.string().max(30).optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial()

router.get('/', requireActivatedAccount(), requirePermission('resourceTypes', 'view'), async (req, res) => {
  res.json(await repo.listResourceTypes(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('resourceTypes', 'view'), async (req, res) => {
  const row = await repo.getResourceType(parseId(req.params.id))
  if (!row) throw new AppError(404, 'Resource type not found')
  res.json(row)
})

router.post('/', requireActivatedAccount(), requirePermission('resourceTypes', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createResourceType(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('resourceTypes', 'update'), validateBody(updateSchema), async (req, res) => {
  const row = await repo.updateResourceType(parseId(req.params.id), req.body)
  if (!row) throw new AppError(404, 'Resource type not found')
  res.json(row)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('resourceTypes', 'delete'), async (req, res) => {
  if (!(await repo.deleteResourceType(parseId(req.params.id)))) throw new AppError(404, 'Resource type not found')
  res.json({ message: 'Resource type deleted' })
})

export default router
