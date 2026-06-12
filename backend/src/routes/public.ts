import { Router } from 'express'
import { z } from 'zod'
import { AppError } from '../middleware/error-handler.js'
import { validateBody } from '../middleware/validate.js'
import { publicOrderLimiter, publicReadLimiter } from '../middleware/rate-limit.js'
import * as repo from '../repositories/public.repo.js'
import * as ordersService from '../services/orders.service.js'

// Public showcase + guest ticketing — mounted WITHOUT authentication.
const router = Router()

router.get('/events', async (_req, res) => {
  res.json(await repo.listPublicEvents())
})

router.get('/events/:slug', async (req, res) => {
  const event = await repo.getPublicEventBySlug(req.params.slug ?? '')
  if (!event) throw new AppError(404, 'Event not found')
  res.json(event)
})

router.get('/events/:slug/ticket-types', async (req, res) => {
  const eventId = await repo.getPublicEventIdBySlug(req.params.slug ?? '')
  if (eventId === null) throw new AppError(404, 'Event not found')
  res.json(await repo.listPublicTicketTypes(eventId))
})

// Guest checkout: no account needed; quantities are validated here, prices and
// capacity are enforced server-side in the orders service.
const orderItemSchema = z.object({
  ticket_type_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(20),
  attendee_names: z.array(z.string().min(1).max(150)).max(20).optional(),
})
const createOrderSchema = z.object({
  event_id: z.number().int().positive(),
  customer_name: z.string().min(1).max(150),
  customer_email: z.email().max(255),
  items: z.array(orderItemSchema).min(1).max(10)
    .refine((items) => new Set(items.map((i) => i.ticket_type_id)).size === items.length, {
      message: 'Duplicate ticket types in the order',
    }),
})

router.post('/orders', publicOrderLimiter, validateBody(createOrderSchema), async (req, res) => {
  res.status(201).json(await ordersService.createPublicOrder(req.body))
})

// The order code is the bearer secret (crypto-random, rate-limited lookups).
router.get('/orders/:code', publicReadLimiter, async (req, res) => {
  res.json(await ordersService.getPublicOrder(req.params.code ?? ''))
})

export default router
