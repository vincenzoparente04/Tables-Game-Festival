import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId, parseOptionalIntQuery } from './helpers.js'
import * as repo from '../repositories/participants.repo.js'

const router = Router()
const jsonObject = z.record(z.string(), z.unknown())

const PARTICIPANT_TYPES = [
  'exhibitor', 'vendor', 'performer', 'attendee', 'sponsor', 'provider', 'association', 'other',
] as const

const createSchema = z.object({
  event_id: z.number().int().positive(),
  participant_type: z.enum(PARTICIPANT_TYPES).optional(),
  name: z.string().min(1).max(255),
  external_ref: z.string().max(255).optional(),
  attributes: jsonObject.optional(),
})
const updateSchema = createSchema.omit({ event_id: true }).partial()

const contactSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.email().max(255).optional(),
  phone: z.string().max(30).optional(),
  role: z.string().max(100).optional(),
})

router.get('/', requireActivatedAccount(), requirePermission('participants', 'view'), async (req, res) => {
  res.json(await repo.listParticipants(parseOptionalIntQuery(req.query.event_id)))
})

router.get('/:id', requireActivatedAccount(), requirePermission('participants', 'view'), async (req, res) => {
  const id = parseId(req.params.id)
  const participant = await repo.getParticipant(id)
  if (!participant) throw new AppError(404, 'Participant not found')
  res.json({ ...participant, contacts: await repo.listContacts(id) })
})

router.post('/', requireActivatedAccount(), requirePermission('participants', 'create'), validateBody(createSchema), async (req, res) => {
  res.status(201).json(await repo.createParticipant(req.body))
})

router.put('/:id', requireActivatedAccount(), requirePermission('participants', 'update'), validateBody(updateSchema), async (req, res) => {
  const participant = await repo.updateParticipant(parseId(req.params.id), req.body)
  if (!participant) throw new AppError(404, 'Participant not found')
  res.json(participant)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('participants', 'delete'), async (req, res) => {
  if (!(await repo.deleteParticipant(parseId(req.params.id)))) throw new AppError(404, 'Participant not found')
  res.json({ message: 'Participant deleted' })
})

// --- Contacts (sub-resource) ---
router.post('/:id/contacts', requireActivatedAccount(), requirePermission('participants', 'update'), validateBody(contactSchema), async (req, res) => {
  const participant = await repo.getParticipant(parseId(req.params.id))
  if (!participant) throw new AppError(404, 'Participant not found')
  res.status(201).json(await repo.addContact(participant.id, req.body))
})

router.delete('/:id/contacts/:contactId', requireActivatedAccount(), requirePermission('participants', 'update'), async (req, res) => {
  const ok = await repo.deleteContact(parseId(req.params.id), parseId(req.params.contactId))
  if (!ok) throw new AppError(404, 'Contact not found')
  res.json({ message: 'Contact deleted' })
})

export default router
