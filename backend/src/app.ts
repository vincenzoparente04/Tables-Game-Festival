import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import authRouter from './routes/auth.js'
import publicRouter from './routes/public.js'
import eventsRouter from './routes/events.js'
import eventTypesRouter from './routes/event-types.js'
import areasRouter from './routes/areas.js'
import resourceTypesRouter from './routes/resource-types.js'
import resourcesRouter from './routes/resources.js'
import pricingTiersRouter from './routes/pricing-tiers.js'
import participantsRouter from './routes/participants.js'
import bookingsRouter from './routes/bookings.js'
import invoicesRouter from './routes/invoices.js'
import publishersRouter from './routes/publishers.js'
import authorsRouter from './routes/authors.js'
import gamesRouter from './routes/games.js'
import usersRouter from './routes/users.js'
import { verifyToken } from './middleware/token-management.js'
import { requireAdmin } from './middleware/auth-admin.js'
import { notFound, errorHandler } from './middleware/error-handler.js'

// Express application, separated from the server bootstrap (server.ts) so it can
// be imported directly by tests (supertest) without opening a port or touching the DB.
//
// NOTE (Fase 2.B): the backend is being rebuilt on the new generic schema one
// domain at a time. Only migrated domains are mounted; the legacy FR routes are
// being ported slice by slice.
const app = express()

app.set('trust proxy', 1)

// Security headers tuned for a cross-site JSON API.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
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
        if (!origin) return callback(null, true)
        return allowedOrigins.has(origin) ? callback(null, true) : callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
}))

app.get('/health', (_req, res) => res.json({ ok: true }))

// Public routes (no authentication)
app.use('/api/auth', authRouter)
app.use('/api/public', publicRouter)
// Authenticated routes (migrated to the generic schema)
app.use('/api/events', verifyToken, eventsRouter)
app.use('/api/event-types', verifyToken, eventTypesRouter)
app.use('/api/areas', verifyToken, areasRouter)
app.use('/api/resource-types', verifyToken, resourceTypesRouter)
app.use('/api/resources', verifyToken, resourcesRouter)
app.use('/api/pricing-tiers', verifyToken, pricingTiersRouter)
app.use('/api/participants', verifyToken, participantsRouter)
app.use('/api/bookings', verifyToken, bookingsRouter)
app.use('/api/invoices', verifyToken, invoicesRouter)
// Games module (board-game festivals)
app.use('/api/publishers', verifyToken, publishersRouter)
app.use('/api/authors', verifyToken, authorsRouter)
app.use('/api/games', verifyToken, gamesRouter)
app.use('/api/users', verifyToken, usersRouter)
app.use('/api/admin', verifyToken, requireAdmin, (_req, res) => {
    res.json({ message: 'Welcome admin' })
})

// 404 + central error handler (must be registered after all routes)
app.use(notFound)
app.use(errorHandler)

export default app
