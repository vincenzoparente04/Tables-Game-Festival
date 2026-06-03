import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId } from './helpers.js'
import * as repo from '../repositories/games.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const createSchema = z.object({
  publisher_id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  min_age: z.number().int().nonnegative().optional(),
  max_age: z.number().int().nonnegative().optional(),
  min_players: z.number().int().positive().optional(),
  max_players: z.number().int().positive().optional(),
  table_size: z.string().max(20).optional(),
  average_duration: z.number().int().nonnegative().optional(),
  attributes: jsonObject.optional(),
  author_ids: z.array(z.number().int().positive()).optional(),
})
const updateSchema = createSchema.partial()

router.get('/', requireActivatedAccount(), requirePermission('games', 'viewAll'), async (_req, res) => {
  res.json(await repo.listGames())
})

router.get('/:id', requireActivatedAccount(), requirePermission('games', 'viewAll'), async (req, res) => {
  const game = await repo.getGame(parseId(req.params.id))
  if (!game) throw new AppError(404, 'Game not found')
  res.json(game)
})

router.post('/', requireActivatedAccount(), requirePermission('games', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createGame(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('games', 'update'), validateBody(updateSchema), async (req, res) => {
  const game = await repo.updateGame(parseId(req.params.id), req.body)
  if (!game) throw new AppError(404, 'Game not found')
  res.json(game)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('games', 'delete'), async (req, res) => {
  if (!(await repo.deleteGame(parseId(req.params.id)))) throw new AppError(404, 'Game not found')
  res.json({ message: 'Game deleted' })
})

export default router
