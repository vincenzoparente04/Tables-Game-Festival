import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import publicRouter from './routes/public.js'
import usersRouter from './routes/users.js'
import authRouter from './routes/auth.js'
import { verifyToken } from './middleware/token-management.js'
import { requireAdmin } from './middleware/auth-admin.js'
import festivalsRouter from './routes/festivals.js'
import zonesTarifairesRouter from './routes/zones-tarifaires.js'
import zonesPlanRouter from './routes/zones-plan.js'
import editeursRouter from './routes/editeurs.js'
import jeuxRouter from './routes/jeux.js'
import viewPublicRouter from './routes/viewPublic.js'
import reservantsRouter from './routes/reservants.js'
import reservationsRouter from './routes/reservations.js'
import facturasRouter from './routes/factures.js'
import { notFound, errorHandler } from './middleware/error-handler.js'

// Express application, separated from the server bootstrap (server.ts) so it can
// be imported directly by tests (supertest) without opening a port or touching the DB.
const app = express()

app.set('trust proxy', 1)

// Security headers (replaces the previous manual block).
// CSP is disabled because this is a JSON API (the frontend manages its own CSP);
// CORP is 'cross-origin' so the cross-site frontend can read API responses.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev')) // request logging
}
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const allowedOrigins = new Set([
    process.env.FRONTEND_URL,
    'https://localhost:8080',
    'http://localhost:8080',
].filter(Boolean) as string[])

app.use(cors({
    origin: (origin, callback) => {
        // allow no-origin requests (curl, server-to-server)
        if (!origin) return callback(null, true)
        return allowedOrigins.has(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
}))

app.get('/health', (_req, res) => res.json({ ok: true }))

// Public routes
app.use('/api/public', publicRouter)
app.use('/api/auth', authRouter)
// Authenticated routes
app.use('/api/festivals', verifyToken, festivalsRouter)
app.use('/api/zones-tarifaires', verifyToken, zonesTarifairesRouter)
app.use('/api/zones-plan', verifyToken, zonesPlanRouter)
app.use('/api/editeurs', verifyToken, editeursRouter)
app.use('/api/jeux', verifyToken, jeuxRouter)
app.use('/api/view-public', verifyToken, viewPublicRouter)
app.use('/api/reservants', verifyToken, reservantsRouter)
app.use('/api/reservations', verifyToken, reservationsRouter)
app.use('/api/factures', verifyToken, facturasRouter)
app.use('/api/users', verifyToken, usersRouter)
app.use('/api/admin', verifyToken, requireAdmin, (_req, res) => {
    res.json({ message: 'Welcome admin' })
})

// 404 + central error handler (must be registered after all routes)
app.use(notFound)
app.use(errorHandler)

export default app
