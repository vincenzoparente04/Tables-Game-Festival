import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import { createAccessToken, createRefreshToken, verifyToken } from './token-management.js'
import { JWT_SECRET } from '../config/env.js'

function mockRes() {
    const res: Record<string, unknown> = { statusCode: 200 }
    res.status = (code: number) => {
        res.statusCode = code
        return res
    }
    res.json = (body: unknown) => {
        res.body = body
        return res
    }
    return res as unknown as Response & { statusCode: number; body?: unknown }
}

describe('token-management', () => {
    it('stamps access tokens with type "access"', () => {
        const decoded = jwt.verify(createAccessToken({ id: 1, role: 'admin' }), JWT_SECRET) as Record<string, unknown>
        expect(decoded.type).toBe('access')
        expect(decoded.id).toBe(1)
        expect(decoded.role).toBe('admin')
    })

    it('stamps refresh tokens with type "refresh"', () => {
        const decoded = jwt.verify(createRefreshToken({ id: 1, role: 'admin' }), JWT_SECRET) as Record<string, unknown>
        expect(decoded.type).toBe('refresh')
    })

    it('accepts a valid access token', () => {
        const req = { cookies: { access_token: createAccessToken({ id: 7, role: 'organisateur' }) } } as never
        const res = mockRes()
        const next = vi.fn()
        verifyToken(req, res, next)
        expect(next).toHaveBeenCalledOnce()
    })

    it('rejects a refresh token presented as an access token', () => {
        const req = { cookies: { access_token: createRefreshToken({ id: 7, role: 'admin' }) } } as never
        const res = mockRes()
        const next = vi.fn()
        verifyToken(req, res, next)
        expect(next).not.toHaveBeenCalled()
        expect(res.statusCode).toBe(403)
    })

    it('rejects when no token is present', () => {
        const req = { cookies: {} } as never
        const res = mockRes()
        const next = vi.fn()
        verifyToken(req, res, next)
        expect(res.statusCode).toBe(401)
        expect(next).not.toHaveBeenCalled()
    })
})
