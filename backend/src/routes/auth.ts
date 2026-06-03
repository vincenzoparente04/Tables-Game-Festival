import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pool from '../db/database.js'
import { verifyToken, createAccessToken, createRefreshToken } from '../middleware/token-management.js'
import { JWT_SECRET } from '../config/env.js'
import type { TokenPayload } from '../types/token-payload.ts'
import { authLimiter } from '../middleware/rate-limit.js'
import { validateBody } from '../middleware/validate.js'
import { z } from 'zod'
import {
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../db/refresh-token-store.js'

const router = Router()

// Pre-computed hash used to equalize bcrypt timing when a login does not exist,
// preventing user-enumeration via response time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-password-placeholder', 10)

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
})

const registerSchema = z.object({
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  email: z.email(),
  login: z.string().min(3).max(255),
  password: z.string().min(8),
})

// ✅ Cookie config per cross-site (Netlify -> Render)
const isProd = process.env.NODE_ENV === 'production'

const cookieBase = {
  httpOnly: true,
  secure: isProd, // in prod (Render) deve essere true (HTTPS)
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax', // ✅ fondamentale
  path: '/',
}

const accessCookie = { ...cookieBase, maxAge: 15 * 60 * 1000 } // 15 min
const refreshCookie = { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days

// Derives the absolute expiry of a signed refresh token from its `exp` claim.
function refreshExpiry(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null
  return decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}

router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const { login, password } = req.body
  if (!login || !password) return res.status(400).json({ error: 'Missing credentials' })

  const { rows } = await pool.query('SELECT * FROM users WHERE login=$1', [login])
  const user = rows[0]

  // Always run a bcrypt comparison (even when the user does not exist) and return
  // a single generic error, to avoid leaking account existence.
  const match = await bcrypt.compare(password, user?.password_hash ?? DUMMY_PASSWORD_HASH)
  if (!user || !match) return res.status(401).json({ error: 'Invalid credentials' })

  const accessToken = createAccessToken({ id: user.id, role: user.role })
  const refreshToken = createRefreshToken({ id: user.id, role: user.role })
  await storeRefreshToken(user.id, refreshToken, refreshExpiry(refreshToken))

  res.cookie('access_token', accessToken, accessCookie)
  res.cookie('refresh_token', refreshToken, refreshCookie)

  res.json({ message: 'Login successful', user: { login: user.login, role: user.role } })
})

router.post('/logout', async (req, res) => {
  const refresh = req.cookies?.refresh_token
  if (refresh) await revokeRefreshToken(refresh)
  // clearCookie must use the same options (path/sameSite/secure) as when set.
  res.clearCookie('access_token', cookieBase)
  res.clearCookie('refresh_token', cookieBase)
  res.json({ message: 'Logged out' })
})

router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  const { first_name, last_name, email, login, password } = req.body
  const hashed = await bcrypt.hash(password, 10)

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (first_name, last_name, email, login, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'user')
       RETURNING id, login, role`,
      [first_name ?? null, last_name ?? null, email, login, hashed],
    )
    res.status(201).json({ message: 'User created', user: rows[0] })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'Login or email already in use' })
    }
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/refresh', authLimiter, async (req, res) => {
  const refresh = req.cookies?.refresh_token
  if (!refresh) return res.status(401).json({ error: 'Refresh token required' })

  let decoded: TokenPayload
  try {
    decoded = jwt.verify(refresh, JWT_SECRET) as TokenPayload
  } catch {
    return res.status(403).json({ error: 'Invalid or expired refresh token' })
  }
  if (decoded.type !== 'refresh') {
    return res.status(403).json({ error: 'Invalid token type' })
  }

  const stored = await findRefreshToken(refresh)
  // Reuse / theft detection: a syntactically valid refresh token that is absent
  // from the store, already revoked, or expired indicates it was rotated away or
  // forged — revoke every token for this user as a precaution.
  if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
    await revokeAllUserRefreshTokens(decoded.id)
    return res.status(403).json({ error: 'Invalid or expired refresh token' })
  }

  // Rotate: revoke the used token and issue a fresh access + refresh pair.
  await revokeRefreshToken(refresh)
  const newAccess = createAccessToken({ id: decoded.id, role: decoded.role })
  const newRefresh = createRefreshToken({ id: decoded.id, role: decoded.role })
  await storeRefreshToken(decoded.id, newRefresh, refreshExpiry(newRefresh))

  res.cookie('access_token', newAccess, accessCookie)
  res.cookie('refresh_token', newRefresh, refreshCookie)
  res.json({ message: 'Token refreshed' })
})

router.get('/whoami', verifyToken, (req, res) => {
  res.json({ user: req.user })
})

export default router