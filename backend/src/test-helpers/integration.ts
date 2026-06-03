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
  await pool.query(
    `INSERT INTO users (first_name, last_name, email, login, password_hash, role)
     VALUES ('Admin','Admin','admin@test.local','admin',$1,'admin')
     ON CONFLICT (login) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [hash],
  )
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/login').send({ login: 'admin', password })
  if (res.status !== 200) {
    throw new Error(`admin login failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return agent
}
