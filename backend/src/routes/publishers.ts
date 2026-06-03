import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId } from './helpers.js'
import * as repo from '../repositories/publishers.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const createSchema = z.object({
  name: z.string().min(1).max(255),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.partial()

router.get('/', requireActivatedAccount(), requirePermission('games', 'viewAll'), async (_req, res) => {
  res.json(await repo.listPublishers())
})

router.get('/:id', requireActivatedAccount(), requirePermission('games', 'viewAll'), async (req, res) => {
  const row = await repo.getPublisher(parseId(req.params.id))
  if (!row) throw new AppError(404, 'Publisher not found')
  res.json(row)
})

router.post('/', requireActivatedAccount(), requirePermission('games', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createPublisher(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('games', 'update'), validateBody(updateSchema), async (req, res) => {
  const row = await repo.updatePublisher(parseId(req.params.id), req.body)
  if (!row) throw new AppError(404, 'Publisher not found')
  res.json(row)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('games', 'delete'), async (req, res) => {
  if (!(await repo.deletePublisher(parseId(req.params.id)))) throw new AppError(404, 'Publisher not found')
  res.json({ message: 'Publisher deleted' })
})

export default router
