import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as service from '../services/expenses.service.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

export const EXPENSE_STATUSES = ['planned', 'committed', 'paid'] as const

const createSchema = z.object({
  event_id: z.number().int().positive(),
  booking_id: z.number().int().positive().optional(),
  participant_id: z.number().int().positive().optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(500),
  amount: z.number().nonnegative(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  due_date: dateString.optional(),
  supplier_invoice_ref: z.string().max(100).optional(),
  attachment_url: z.url().max(2048).optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial().extend({
  booking_id: z.number().int().positive().nullable().optional(),
  participant_id: z.number().int().positive().nullable().optional(),
  due_date: dateString.nullable().optional(),
  supplier_invoice_ref: z.string().max(100).nullable().optional(),
  attachment_url: z.url().max(2048).nullable().optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('expenses', 'view'), async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  if (status !== undefined && !(EXPENSE_STATUSES as readonly string[]).includes(status)) {
    throw new AppError(400, 'Invalid status filter')
  }
  const category = typeof req.query.category === 'string' ? req.query.category : undefined
  res.json(await service.listExpenses(parseOptionalIntQuery(req.query.event_id), status, category))
})

router.get('/:id', requireActivatedAccount(), requirePermission('expenses', 'view'), async (req, res) => {
  res.json(await service.getExpense(parseId(req.params.id)))
})

router.post('/', requireActivatedAccount(), requirePermission('expenses', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await service.createExpense(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('expenses', 'update'), validateBody(updateSchema), async (req, res) => {
  res.json(await service.updateExpense(parseId(req.params.id), req.body))
})

router.delete('/:id', requireActivatedAccount(), requirePermission('expenses', 'delete'), async (req, res) => {
  await service.deleteExpense(parseId(req.params.id))
  res.json({ message: 'Expense deleted' })
})

export default router
