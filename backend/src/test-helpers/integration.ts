import bcrypt from 'bcryptjs'
import request from 'supertest'
import pool from '../db/database.js'
import app from '../app.js'

// DB-backed integration tests run only when RUN_DB_TESTS=1 (see `npm run test:db`,
// which provisions a throwaway Postgres and applies migrations first).
export const runDbTests = process.env.RUN_DB_TESTS === '1'

// Seeds an admin user and returns a supertest agent already logged in.
export async function authedAdminAgent() {
  const password = 'Admin123!'
  const hash = bcrypt.hashSync(password, 10)
  try {
    await pool.query(
      `INSERT INTO users (first_name, last_name, email, login, password_hash, role)
       VALUES ('Admin','Admin','admin@test.local','admin',$1,'admin')
       ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [hash],
    )
  } catch (err) {
    // Parallel test files may seed the admin concurrently: ON CONFLICT only
    // covers the login key, so the race can still surface as a unique
    // violation (e.g. on email). The row is identical — safe to ignore.
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined
    if (code !== '23505') throw err
  }
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/login').send({ login: 'admin', password })
  if (res.status !== 200) {
    throw new Error(`admin login failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return agent
}
