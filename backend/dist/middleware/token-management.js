import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRATION, REFRESH_EXPIRATION } from '../config/en.js';
// --- Fonctions de création et de vérification des tokens ---
export function createAccessToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}
export function createRefreshToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: REFRESH_EXPIRATION });
}
export function verifyToken(req, res, next) {
    const token = req.cookies?.access_token;
    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(403).json({ error: 'Token invalide ou expiré' });
    }
}
//# sourceMappingURL=token-management.js.map