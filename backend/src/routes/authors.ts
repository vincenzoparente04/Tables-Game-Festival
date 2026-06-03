import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId } from './helpers.js'
import * as repo from '../repositories/authors.repo.js'

const router = Router()

const createSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100),
})
const updateSchema = createSchema.partial()

router.get('/', requireActivatedAccount(), requirePermission('games', 'viewAll'), async (_req, res) => {
  res.json(await repo.listAuthors())
})

router.get('/:id', requireActivatedAccount(), requirePermission('games', 'viewAll'), async (req, res) => {
  const row = await repo.getAuthor(parseId(req.params.id))
  if (!row) throw new AppError(404, 'Author not found')
  res.json(row)
})

router.post('/', requireActivatedAccount(), requirePermission('games', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createAuthor(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('games', 'update'), validateBody(updateSchema), async (req, res) => {
  const row = await repo.updateAuthor(parseId(req.params.id), req.body)
  if (!row) throw new AppError(404, 'Author not found')
  res.json(row)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('games', 'delete'), async (req, res) => {
  if (!(await repo.deleteAuthor(parseId(req.params.id)))) throw new AppError(404, 'Author not found')
  res.json({ message: 'Author deleted' })
})

export default router
