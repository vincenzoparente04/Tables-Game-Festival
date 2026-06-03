import crypto from 'crypto'
import pool from './database.js'

// Refresh tokens are persisted only as SHA-256 hashes, so a database leak does
// not expose usable tokens.
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export interface StoredRefreshToken {
    id: number
    user_id: number
    token_hash: string
    expires_at: Date
    revoked_at: Date | null
    created_at: Date
}

export async function storeRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, hashToken(token), expiresAt],
    )
}

export async function findRefreshToken(token: string): Promise<StoredRefreshToken | null> {
    const { rows } = await pool.query(`SELECT * FROM refresh_tokens WHERE token_hash = $1`, [
        hashToken(token),
    ])
    return rows[0] ?? null
}

export async function revokeRefreshToken(token: string): Promise<void> {
    await pool.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [hashToken(token)],
    )
}

export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
    await pool.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
    )
}
