import type { Response, NextFunction } from 'express'
import { Role, hasPermission, PERMISSIONS } from '../config/roles.config.js'

// Allow only the given roles.
export function requireRole(allowedRoles: Role[]) {
  return (req: Express.Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!hasPermission(req.user.role, allowedRoles)) {
      return res.status(403).json({ error: 'Access denied', required: allowedRoles })
    }
    next()
  }
}

// Require a specific permission (resource + action) from the matrix.
export function requirePermission(resource: string, action: string) {
  return (req: Express.Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    const allowedRoles = PERMISSIONS[resource]?.[action]
    if (!allowedRoles) {
      console.error(`Undefined permission: ${resource}.${action}`)
      return res.status(500).json({ error: 'Invalid permission configuration' })
    }
    if (!hasPermission(req.user.role, allowedRoles)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `You do not have permission to ${action} on ${resource}`,
      })
    }
    next()
  }
}

// Reject pending (USER) accounts awaiting admin validation.
export function requireActivatedAccount() {
  return (req: Express.Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (req.user.role === Role.USER) {
      return res.status(403).json({
        error: 'Account pending validation',
        message: 'Your account must be approved by an administrator before accessing this resource',
      })
    }
    next()
  }
}
