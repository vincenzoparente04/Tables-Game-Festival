import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/ticket-types.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())
const isoDatetime = z.iso.datetime({ offset: true })

const createSchema = z.object({
  event_id: z.number().int().positive(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  capacity: z.number().int().nonnegative().optional(),
  sales_start_at: isoDatetime.optional(),
  sales_end_at: isoDatetime.optional(),
  max_per_order: z.number().int().positive().max(100).optional(),
  status: z.enum(['hidden', 'on_sale', 'paused']).optional(),
  position: z.number().int().optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial().extend({
  description: z.string().nullable().optional(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  sales_start_at: isoDatetime.nullable().optional(),
  sales_end_at: isoDatetime.nullable().optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('ticketTypes', 'view'), async (req, res) => {
  res.json(await repo.listTicketTypes(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('ticketTypes', 'view'), async (req, res) => {
  const type = await repo.getTicketType(parseId(req.params.id))
  if (!type) throw new AppError(404, 'Ticket type not found')
  res.json(type)
})

router.post('/', requireActivatedAccount(), requirePermission('ticketTypes', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createTicketType(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('ticketTypes', 'update'), validateBody(updateSchema), async (req, res) => {
  const type = await repo.updateTicketType(parseId(req.params.id), req.body)
  if (!type) throw new AppError(404, 'Ticket type not found')
  res.json(type)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('ticketTypes', 'delete'), async (req, res) => {
  const id = parseId(req.params.id)
  if (await repo.hasTickets(id)) {
    throw new AppError(409, 'Ticket type has sold tickets and cannot be deleted — pause it instead')
  }
  if (!(await repo.deleteTicketType(id))) throw new AppError(404, 'Ticket type not found')
  res.json({ message: 'Ticket type deleted' })
})

export default router
