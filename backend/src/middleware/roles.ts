import type { Response, NextFunction } from 'express'

// les autres roles 
export function requireRole(roles: string[]) {
    return (req: Express.Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accès non autorisé' })
        }
        next()
    }
}