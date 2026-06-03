import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/invoices.service.js'
import { computeBookingQuote } from '../services/pricing.service.js'

const router = Router()
const generateSchema = z.object({ booking_id: z.number().int().positive() })

router.get('/', requireActivatedAccount(), requirePermission('invoices', 'view'), async (req, res) => {
  res.json(await service.listInvoices(
    parseOptionalIntQuery(req.query.event_id),
    parseOptionalIntQuery(req.query.booking_id),
  ))
})

// Price preview for a booking (does not persist an invoice).
router.get('/preview/:bookingId', requireActivatedAccount(), requirePermission('invoices', 'view'), async (req, res) => {
  res.json(await computeBookingQuote(parseId(req.params.bookingId)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('invoices', 'view'), async (req, res) => {
  res.json(await service.getInvoice(parseId(req.params.id)))
})

router.post('/generate', requireActivatedAccount(), requirePermission('invoices', 'create'), validateBody(generateSchema), async (req, res) => {
  res.status(201).json(await service.generateForBooking(req.body.booking_id))
})

router.patch('/:id/mark-paid', requireActivatedAccount(), requirePermission('invoices', 'markPaid'), async (req, res) => {
  res.json(await service.markPaid(parseId(req.params.id)))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('invoices', 'delete'), async (req, res) => {
  await service.deleteInvoice(parseId(req.params.id))
  res.json({ message: 'Invoice deleted' })
})

export default router
