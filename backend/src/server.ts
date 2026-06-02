import fs from 'fs'
import https from 'https'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import publicRouter from './routes/public.js'
import { ensureAdmin } from './db/initAdmin.js'
import usersRouter from './routes/users.js'
import 'dotenv/config'
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




// Création de l’application Express
const app = express()

app.set('trust proxy', 1);

// Security headers (replaces the previous manual block).
// CSP is disabled because this is a JSON API (the frontend manages its own CSP);
// CORP is 'cross-origin' so the cross-site frontend can read API responses.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(morgan('dev')) // Log des requêtes : Visualiser le flux de requêtes entre Angular et Express
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Configuration CORS : autoriser le front Angular en HTTPS local
/*app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))*/

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "https://localhost:8080",
  "http://localhost:8080",
].filter(Boolean) as string[]);

app.use(cors({
  origin: (origin, callback) => {
    // allow no-origin requests (curl, server-to-server)
    if (!origin) return callback(null, true);
    return allowedOrigins.has(origin) ? callback(null, true) : callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));


app.get("/health", (req, res) => res.json({ ok: true }));

// Routes publiques
app.use('/api/public', publicRouter)
app.use('/api/auth', authRouter);
app.use('/api/festivals', verifyToken, festivalsRouter);
app.use('/api/zones-tarifaires', verifyToken, zonesTarifairesRouter);
app.use('/api/zones-plan', verifyToken, zonesPlanRouter);
app.use('/api/editeurs', verifyToken, editeursRouter);
app.use('/api/jeux', verifyToken, jeuxRouter);
app.use('/api/view-public', verifyToken, viewPublicRouter);
app.use('/api/reservants', verifyToken, reservantsRouter);
app.use('/api/reservations', verifyToken, reservationsRouter);
app.use('/api/factures', verifyToken, facturasRouter);
app.use('/api/users', verifyToken, usersRouter); 
app.use('/api/admin', verifyToken, requireAdmin, (req, res) => {
res.json({ message: 'Welcome admin' });
})

// 404 + central error handler (must be registered after all routes)
app.use(notFound)
app.use(errorHandler)


const port = Number(process.env.PORT) || 4000

if (process.env.NODE_ENV === 'production') {
  // In production, let the platform (Render/Railway) handle HTTPS.
  app.listen(port, () => {
    console.log(`👍 API server running on http://0.0.0.0:${port}`)
  })
} else {
  // Local dev HTTPS with mkcert
  const key = fs.readFileSync('./certs/localhost-key.pem')
  const cert = fs.readFileSync('./certs/localhost.pem')

  https.createServer({ key, cert }, app).listen(port, () => {
    console.log(`👍 Serveur API démarré sur https://localhost:${port}`)
  })
}

await ensureAdmin()