import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/event-images.repo.js'
import { deleteImage } from '../services/uploads.service.js'

const router = Router()

const createSchema = z.object({
  event_id: z.number().int().positive(),
  url: z.url().max(2048),
  public_id: z.string().max(255).optional(),
  kind: z.enum(['gallery', 'poster']).optional(),
  position: z.number().int().optional(),
  alt: z.string().max(255).optional(),
})
const updateSchema = z.object({
  kind: z.enum(['gallery', 'poster']).optional(),
  position: z.number().int().optional(),
  alt: z.string().max(255).nullable().optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('eventImages', 'view'), async (req, res) => {
  res.json(await repo.listEventImages(parseOptionalIntQuery(req.query.event_id)))
})

router.post('/', requireActivatedAccount(), requirePermission('eventImages', 'manage'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createEventImage(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('eventImages', 'manage'), validateBody(updateSchema), async (req, res) => {
  const image = await repo.updateEventImage(parseId(req.params.id), req.body)
  if (!image) throw new AppError(404, 'Event image not found')
  res.json(image)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('eventImages', 'manage'), async (req, res) => {
  const image = await repo.getEventImage(parseId(req.params.id))
  if (!image) throw new AppError(404, 'Event image not found')
  await repo.deleteEventImage(image.id)
  // Purge the Cloudinary asset best-effort; the DB row is the source of truth.
  if (image.public_id) await deleteImage(image.public_id)
  res.json({ message: 'Event image deleted' })
})

export default router
