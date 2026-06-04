import { Router } from 'express'
import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/public.repo.js'

// Public showcase — mounted WITHOUT authentication.
const router = Router()

router.get('/events', async (_req, res) => {
  res.json(await repo.listPublicEvents())
})

router.get('/events/:slug', async (req, res) => {
  const event = await repo.getPublicEventBySlug(req.params.slug ?? '')
  if (!event) throw new AppError(404, 'Event not found')
  res.json(event)
})

export default router
