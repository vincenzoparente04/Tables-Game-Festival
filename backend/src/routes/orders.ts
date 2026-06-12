import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/orders.service.js'

// Staff-side order management; the public checkout lives in routes/public.ts.
const router = Router()

export const ORDER_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired', 'refunded'] as const

const checkInSchema = z.object({ code: z.string().min(4).max(20) })

router.get('/', requireActivatedAccount(), requirePermission('orders', 'view'), async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  if (status !== undefined && !(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new AppError(400, 'Invalid status filter')
  }
  res.json(await service.listOrders(parseOptionalIntQuery(req.query.event_id), status))
})

router.get('/:id', requireActivatedAccount(), requirePermission('orders', 'view'), async (req, res) => {
  res.json(await service.getOrderDetail(parseId(req.params.id)))
})

router.patch('/:id/cancel', requireActivatedAccount(), requirePermission('orders', 'cancel'), async (req, res) => {
  res.json(await service.cancelOrder(parseId(req.params.id)))
})

// Door check-in by ticket code (QR payload) — volunteers are allowed.
router.post('/check-in', requireActivatedAccount(), requirePermission('orders', 'checkIn'), validateBody(checkInSchema), async (req, res) => {
  res.json(await service.checkInByCode(req.body.code))
})

export default router
