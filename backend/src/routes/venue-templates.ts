import { Router } from 'express'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { VENUE_TEMPLATES } from '../services/venue-templates.js'

// Read-only catalog of map starting points (one per location category).
const router = Router()

router.get('/', requireActivatedAccount(), requirePermission('venueMaps', 'view'), (_req, res) => {
  res.json(VENUE_TEMPLATES)
})

export default router
