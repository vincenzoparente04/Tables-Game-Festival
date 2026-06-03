import pool from './database.js'
import bcrypt from 'bcryptjs'

// Bootstraps an admin account from environment variables.
// No insecure default credentials are ever created: if ADMIN_LOGIN /
// ADMIN_PASSWORD are not set, the bootstrap is skipped.
export async function ensureAdmin() {
    const login = process.env.ADMIN_LOGIN
    const password = process.env.ADMIN_PASSWORD

    if (!login || !password) {
        console.warn('⚠️  ADMIN_LOGIN/ADMIN_PASSWORD not set — skipping admin bootstrap (no default admin created).')
        return
    }

    const email = process.env.ADMIN_EMAIL || `${login}@local`
    const hash = await bcrypt.hash(password, 10)
    await pool.query(
        `INSERT INTO users (first_name, last_name, email, login, password_hash, role)
        VALUES ('Admin', 'Admin', $1, $2, $3, 'admin')
        ON CONFLICT (login) DO NOTHING`,
        [email, login, hash]
    )
    console.log(`✅ Admin account ensured (login: ${login})`)
}
