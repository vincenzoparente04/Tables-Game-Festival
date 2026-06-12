import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/event-artists.service.js'

const router = Router()

const createSchema = z.object({
  event_id: z.number().int().positive(),
  artist_id: z.number().int().positive(),
  booking_id: z.number().int().positive().optional(),
  is_headliner: z.boolean().optional(),
  display_order: z.number().int().optional(),
})
const updateSchema = z.object({
  booking_id: z.number().int().positive().nullable().optional(),
  is_headliner: z.boolean().optional(),
  display_order: z.number().int().optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('eventArtists', 'view'), async (req, res) => {
  const eventId = parseOptionalIntQuery(req.query.event_id)
  if (eventId === undefined) throw new AppError(400, 'event_id query parameter is required')
  res.json(await service.listLineup(eventId))
})

router.post('/', requireActivatedAccount(), requirePermission('eventArtists', 'manage'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await service.addToLineup(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('eventArtists', 'manage'), validateBody(updateSchema), async (req, res) => {
  res.json(await service.updateLineupEntry(parseId(req.params.id), req.body))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('eventArtists', 'manage'), async (req, res) => {
  await service.removeFromLineup(parseId(req.params.id))
  res.json({ message: 'Lineup entry removed' })
})

export default router
