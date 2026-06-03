import pool from './database.js'

// Idempotently ensures auxiliary tables exist. Runs at startup (server.ts).
// Fase 2 will replace this with a proper migration tool.
export async function ensureSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            revoked_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
    )
    console.log('👍 Schema ensured (refresh_tokens)')
}
