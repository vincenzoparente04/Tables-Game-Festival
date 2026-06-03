import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/pricing-tiers.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const createSchema = z.object({
  event_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  resource_type_id: z.number().int().positive().optional(),
  area_id: z.number().int().positive().optional(),
  unit_price: z.number().nonnegative().optional(),
  price_per_sqm: z.number().nonnegative().optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial()

router.get('/', requireActivatedAccount(), requirePermission('pricingTiers', 'view'), async (req, res) => {
  res.json(await repo.listPricingTiers(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('pricingTiers', 'view'), async (req, res) => {
  const row = await repo.getPricingTier(parseId(req.params.id))
  if (!row) throw new AppError(404, 'Pricing tier not found')
  res.json(row)
})

router.post('/', requireActivatedAccount(), requirePermission('pricingTiers', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createPricingTier(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('pricingTiers', 'update'), validateBody(updateSchema), async (req, res) => {
  const row = await repo.updatePricingTier(parseId(req.params.id), req.body)
  if (!row) throw new AppError(404, 'Pricing tier not found')
  res.json(row)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('pricingTiers', 'delete'), async (req, res) => {
  if (!(await repo.deletePricingTier(parseId(req.params.id)))) throw new AppError(404, 'Pricing tier not found')
  res.json({ message: 'Pricing tier deleted' })
})

export default router
