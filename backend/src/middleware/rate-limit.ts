import rateLimit from 'express-rate-limit'

// Throttles brute-force attempts against authentication endpoints.
// Relies on `app.set('trust proxy', 1)` so the client IP is read correctly
// behind the platform proxy (Render).
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // max attempts per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later.' },
})
