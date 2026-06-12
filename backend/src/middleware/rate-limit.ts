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

// Skipped under test so integration suites can exercise the flows freely.
const skipInTests = () => process.env.NODE_ENV === 'test'

// Public guest checkout: a handful of orders per IP per window is plenty.
export const publicOrderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTests,
    message: { error: 'Too many orders from this address, please try again later.' },
})

// Public order lookups: the order code is a bearer secret — throttle guessing.
export const publicReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipInTests,
    message: { error: 'Too many requests, please try again later.' },
})
