import crypto from 'node:crypto'
import type { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { TokenPayload } from '../types/token-payload.ts'
import { JWT_SECRET, JWT_EXPIRATION, REFRESH_EXPIRATION } from '../config/env.js';

// --- Token creation & verification ---
// Access and refresh tokens carry a `type` claim so that a refresh token can
// never be accepted in place of an access token (and vice versa), even though
// they are signed with the same secret.
export function createAccessToken(user: TokenPayload) {
    return jwt.sign({ id: user.id, role: user.role, type: 'access', jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: JWT_EXPIRATION })
}
export function createRefreshToken(user: TokenPayload) {
    // A unique jti guarantees each refresh token (and its stored hash) is distinct,
    // even when the same user logs in twice within the same second.
    return jwt.sign({ id: user.id, role: user.role, type: 'refresh', jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: REFRESH_EXPIRATION })
}
export function verifyToken(req: Express.Request, res: Response, next: NextFunction) {
    const token = req.cookies?.access_token
    if (!token) { return res.status(401).json({ error: 'Authentication required' }) }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
        if (decoded.type !== 'access') {
            return res.status(403).json({ error: 'Invalid token type' })
        }
        req.user = decoded
        next()
    } catch {
        res.status(403).json({ error: 'Invalid or expired token' })
    }
}
