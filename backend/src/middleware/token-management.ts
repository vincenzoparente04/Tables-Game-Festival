import type { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { TokenPayload } from '../types/token-payload.ts'
import { JWT_SECRET, JWT_EXPIRATION, REFRESH_EXPIRATION } from '../config/en.js';
// --- Fonctions de création et de vérification des tokens ---
export function createAccessToken(user: TokenPayload) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRATION })
}
export function createRefreshToken(user: TokenPayload) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: REFRESH_EXPIRATION })
}
export function verifyToken(req: Express.Request, res: Response, next: NextFunction) {
    const token = req.cookies?.access_token
    if (!token) { return res.status(401).json({ error: 'Token manquant' }) }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
        req.user = decoded
        next()
    } catch {
        res.status(403).json({ error: 'Token invalide ou expiré' })
    }
}