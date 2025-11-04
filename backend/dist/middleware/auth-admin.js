// --- Middleware d'autorisation ---
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
}
//# sourceMappingURL=auth-admin.js.map