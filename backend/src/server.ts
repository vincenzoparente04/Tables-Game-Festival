import fs from 'fs'
import https from 'https'
import 'dotenv/config'
import app from './app.js'
import { ensureAdmin } from './db/initAdmin.js'

const port = Number(process.env.PORT) || 4000

if (process.env.NODE_ENV === 'production') {
  // In production the platform (Render) terminates TLS.
  app.listen(port, () => {
    console.log(`👍 API server running on http://0.0.0.0:${port}`)
  })
} else {
  // Local dev HTTPS with mkcert certificates.
  const key = fs.readFileSync('./certs/localhost-key.pem')
  const cert = fs.readFileSync('./certs/localhost.pem')

  https.createServer({ key, cert }, app).listen(port, () => {
    console.log(`👍 API server started on https://localhost:${port}`)
  })
}

await ensureAdmin()
