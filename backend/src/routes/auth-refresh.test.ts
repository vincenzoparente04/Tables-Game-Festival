import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DB-backed refresh token store so these tests run without a database.
vi.mock('../db/refresh-token-store.js', () => ({
    storeRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllUserRefreshTokens: vi.fn(),
}))

import request from 'supertest'
import app from '../app.js'
import { createRefreshToken, createAccessToken } from '../middleware/token-management.js'
import * as store from '../db/refresh-token-store.js'

const cookie = (token: string) => [`refresh_token=${token}`]

describe('POST /api/auth/refresh — rotation & revocation', () => {
    beforeEach(() => vi.clearAllMocks())

    it('401 when no refresh cookie is present', async () => {
        const res = await request(app).post('/api/auth/refresh')
        expect(res.status).toBe(401)
    })

    it('403 when an access token is presented as a refresh token', async () => {
        const access = createAccessToken({ id: 1, role: 'admin' })
        const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie(access))
        expect(res.status).toBe(403)
        expect(store.findRefreshToken).not.toHaveBeenCalled()
    })

    it('403 + revokes all user tokens when the token is unknown (reuse/forged)', async () => {
        vi.mocked(store.findRefreshToken).mockResolvedValue(null)
        const token = createRefreshToken({ id: 42, role: 'admin' })
        const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie(token))
        expect(res.status).toBe(403)
        expect(store.revokeAllUserRefreshTokens).toHaveBeenCalledWith(42)
    })

    it('403 when the stored token is already revoked (theft signal)', async () => {
        vi.mocked(store.findRefreshToken).mockResolvedValue({
            id: 1,
            user_id: 42,
            token_hash: 'x',
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: new Date(),
            created_at: new Date(),
        })
        const token = createRefreshToken({ id: 42, role: 'admin' })
        const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie(token))
        expect(res.status).toBe(403)
        expect(store.revokeAllUserRefreshTokens).toHaveBeenCalledWith(42)
    })

    it('rotates a valid token: revokes old, stores new, sets both cookies', async () => {
        vi.mocked(store.findRefreshToken).mockResolvedValue({
            id: 1,
            user_id: 42,
            token_hash: 'x',
            expires_at: new Date(Date.now() + 60_000),
            revoked_at: null,
            created_at: new Date(),
        })
        const token = createRefreshToken({ id: 42, role: 'admin' })
        const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie(token))
        expect(res.status).toBe(200)
        expect(store.revokeRefreshToken).toHaveBeenCalledOnce()
        expect(store.storeRefreshToken).toHaveBeenCalledOnce()
        const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';')
        expect(setCookie).toContain('access_token')
        expect(setCookie).toContain('refresh_token')
    })
})
