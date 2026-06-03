import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { validateBody } from '../middleware/validate.js'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { Role } from '../config/roles.config.js'
import { AppError } from '../middleware/error-handler.js'
import { parseId } from './helpers.js'
import * as repo from '../repositories/users.repo.js'

const router = Router()

const createSchema = z.object({
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  email: z.email(),
  login: z.string().min(3).max(255),
  password: z.string().min(8),
  role: z.enum(Role),
})
const roleSchema = z.object({ role: z.enum(Role) })

router.get('/', requireActivatedAccount(), requirePermission('users', 'view'), async (_req, res) => {
  res.json(await repo.listUsers())
})

router.get('/pending', requireActivatedAccount(), requirePermission('users', 'validatePending'), async (_req, res) => {
  res.json(await repo.listPendingUsers())
})

router.get('/roles/available', requireActivatedAccount(), requirePermission('users', 'view'), (_req, res) => {
  res.json({ roles: Object.values(Role) })
})

router.post('/', requireActivatedAccount(), requirePermission('users', 'create'), validateBody(createSchema), async (req, res) => {
  const { password, ...rest } = req.body
  const password_hash = await bcrypt.hash(password, 10)
  res.status(201).json(await repo.createUser({ ...rest, password_hash }))
})

router.patch('/:id/role', requireActivatedAccount(), requirePermission('users', 'changeRole'), validateBody(roleSchema), async (req, res) => {
  const user = await repo.updateUserRole(parseId(req.params.id), req.body.role)
  if (!user) throw new AppError(404, 'User not found')
  res.json(user)
})

router.patch('/:id/validate', requireActivatedAccount(), requirePermission('users', 'validatePending'), validateBody(roleSchema), async (req, res) => {
  if (req.body.role === Role.USER) throw new AppError(400, 'Cannot validate an account to the pending "user" role')
  const user = await repo.updateUserRole(parseId(req.params.id), req.body.role)
  if (!user) throw new AppError(404, 'User not found')
  res.json(user)
})

router.delete('/:id', requireActivatedAccount(), requirePermission('users', 'delete'), async (req, res) => {
  if (!(await repo.deleteUser(parseId(req.params.id)))) throw new AppError(404, 'User not found')
  res.json({ message: 'User deleted' })
})

export default router
