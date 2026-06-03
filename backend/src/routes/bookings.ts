import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/bookings.service.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())
const ATTENDANCE = ['unset', 'present', 'presumed_absent', 'absent'] as const

const createSchema = z.object({
  event_id: z.number().int().positive(),
  participant_id: z.number().int().positive(),
  stage_id: z.number().int().positive().optional(),
  attendance_status: z.enum(ATTENDANCE).optional(),
  notes: z.string().optional(),
  discount_amount: z.number().nonnegative().optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true, participant_id: true }).partial()
const resourceSchema = z.object({
  resource_type_id: z.number().int().positive(),
  area_id: z.number().int().positive().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative().optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('bookings', 'view'), async (req, res) => {
  res.json(await service.listBookings(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('bookings', 'view'), async (req, res) => {
  res.json(await service.getBooking(parseId(req.params.id)))
})

router.post('/', requireActivatedAccount(), requirePermission('bookings', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await service.createBooking(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('bookings', 'update'), validateBody(updateSchema), async (req, res) => {
  res.json(await service.updateBooking(parseId(req.params.id), req.body))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('bookings', 'delete'), async (req, res) => {
  await service.deleteBooking(parseId(req.params.id))
  res.json({ message: 'Booking deleted' })
})

// --- Booked resources (sub-resource) ---
router.post('/:id/resources', requireActivatedAccount(), requirePermission('bookings', 'update'), validateBody(resourceSchema), async (req, res) => {
  res.status(201).json(await service.addResource(parseId(req.params.id), req.body))
})

router.delete('/:id/resources/:resourceId', requireActivatedAccount(), requirePermission('bookings', 'update'), async (req, res) => {
  await service.removeResource(parseId(req.params.id), parseId(req.params.resourceId))
  res.json({ message: 'Booked resource removed' })
})

export default router
