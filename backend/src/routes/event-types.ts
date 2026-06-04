import { Router } from 'express'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId } from './helpers.js'
import * as repo from '../repositories/event-types.repo.js'

const router = Router()

router.get('/', requireActivatedAccount(), requirePermission('eventTypes', 'view'), async (_req, res) => {
  res.json(await repo.listEventTypes())
})

router.get('/:id', requireActivatedAccount(), requirePermission('eventTypes', 'view'), async (req, res) => {
  const row = await repo.getEventType(parseId(req.params.id))
  if (!row) throw new AppError(404, 'Event type not found')
  res.json(row)
})

export default router
