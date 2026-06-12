import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId } from './helpers.js'
import * as repo from '../repositories/artists.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

// Known kinds are suggested in the UI; any non-empty string is accepted so new
// kinds never require a deploy.
export const ARTIST_KINDS = [
  'musician', 'band', 'dj', 'painter', 'sculptor', 'photographer', 'performer', 'collective', 'other',
] as const

const createSchema = z.object({
  name: z.string().min(1).max(255),
  kind: z.string().min(1).max(50).optional(),
  bio: z.string().optional(),
  image_url: z.url().max(2048).optional(),
  links: z.record(z.string(), z.url()).optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.partial()

router.get('/', requireActivatedAccount(), requirePermission('artists', 'view'), async (req, res) => {
  const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined
  const search = typeof req.query.search === 'string' ? req.query.search : undefined
  res.json(await repo.listArtists(kind, search))
})

router.get('/:id', requireActivatedAccount(), requirePermission('artists', 'view'), async (req, res) => {
  const artist = await repo.getArtist(parseId(req.params.id))
  if (!artist) throw new AppError(404, 'Artist not found')
  res.json(artist)
})

router.post('/', requireActivatedAccount(), requirePermission('artists', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createArtist(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('artists', 'update'), validateBody(updateSchema), async (req, res) => {
  const artist = await repo.updateArtist(parseId(req.params.id), req.body)
  if (!artist) throw new AppError(404, 'Artist not found')
  res.json(artist)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('artists', 'delete'), async (req, res) => {
  if (!(await repo.deleteArtist(parseId(req.params.id)))) throw new AppError(404, 'Artist not found')
  res.json({ message: 'Artist deleted' })
})

export default router
