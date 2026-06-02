import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './app.js'

describe('app (integration)', () => {
    it('GET /health returns ok', async () => {
        const res = await request(app).get('/health')
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ ok: true })
    })

    it('sets security headers and hides x-powered-by', async () => {
        const res = await request(app).get('/health')
        expect(res.headers['x-content-type-options']).toBe('nosniff')
        expect(res.headers['x-powered-by']).toBeUndefined()
    })

    it('returns JSON 404 for unknown routes', async () => {
        const res = await request(app).get('/api/does-not-exist')
        expect(res.status).toBe(404)
        expect(res.body).toEqual({ error: 'Not found' })
    })

    it('rejects login with an invalid body (zod 400)', async () => {
        const res = await request(app).post('/api/auth/login').send({})
        expect(res.status).toBe(400)
        expect(res.body.error).toBe('Validation failed')
    })

    it('blocks a protected route without a token (401)', async () => {
        const res = await request(app).get('/api/festivals')
        expect(res.status).toBe(401)
    })
})
