import type { Response, NextFunction } from 'express'
// --- Middleware d'autorisation ---
export function requireAdmin( req: Express.Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
    }
    next()
}