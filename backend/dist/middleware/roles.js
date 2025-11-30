import { Role, hasPermission, PERMISSIONS } from '../config/roles.config.js';
// les autres roles 
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const userRole = req.user.role;
        if (!hasPermission(userRole, allowedRoles)) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: `Ce rôle (${userRole}) n'a pas les permissions nécessaires`,
                required: allowedRoles
            });
        }
        next();
    };
}
// Middleware pour vérifier une permission spécifique
export function requirePermission(resource, action) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const userRole = req.user.role;
        const allowedRoles = PERMISSIONS[resource]?.[action];
        if (!allowedRoles) {
            console.error(`Permission non définie: ${resource}.${action}`);
            return res.status(500).json({ error: 'Configuration de permission invalide' });
        }
        if (!hasPermission(userRole, allowedRoles)) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: `Vous n'avez pas la permission de ${action} sur ${resource}`,
                userRole,
                required: allowedRoles
            });
        }
        next();
    };
}
// Middleware pour refuser les comptes USER (en attente)
export function requireActivatedAccount() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        if (req.user.role === Role.USER) {
            return res.status(403).json({
                error: 'Compte en attente de validation',
                message: 'Votre compte doit être validé par un administrateur avant de pouvoir accéder à cette ressource'
            });
        }
        next();
    };
}
//# sourceMappingURL=roles.js.map