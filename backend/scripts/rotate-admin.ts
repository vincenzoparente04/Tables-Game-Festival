import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pool from '../src/db/database.js'

// One-off operational script: rotates the password of the existing admin
// account (e.g. to retire the legacy "admin/admin" default in production).
// Usage: ADMIN_LOGIN=... ADMIN_PASSWORD=... npm run admin:rotate

const login = process.env.ADMIN_LOGIN
const password = process.env.ADMIN_PASSWORD

if (!login || !password) {
    console.error('❌ Set ADMIN_LOGIN and ADMIN_PASSWORD before running this script.')
    process.exit(1)
}

const hash = await bcrypt.hash(password, 10)
const { rowCount } = await pool.query(
    `UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE login = $2 AND role = 'admin'`,
    [hash, login],
)

if (rowCount && rowCount > 0) {
    console.log(`✅ Password rotated for admin '${login}'.`)
} else {
    console.warn(`⚠️  No admin account found with login '${login}'. Nothing changed.`)
}

await pool.end()
