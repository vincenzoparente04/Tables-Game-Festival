import { describe, it, expect, afterAll } from 'vitest'
import pool from './db/database.js'
import { authedAdminAgent, runDbTests } from './test-helpers/integration.js'

// Full core flow against a real Postgres (gated by RUN_DB_TESTS).
describe.skipIf(!runDbTests)('integration: core booking → invoice flow', () => {
  afterAll(async () => {
    await pool.end()
  })

  it('creates the event tree, books resources and generates the invoice', async () => {
    const agent = await authedAdminAgent()

    const event = (await agent.post('/api/events').send({ event_type_id: 1, name: 'IT Event' })).body
    const participant = (await agent.post('/api/participants').send({ event_id: event.id, name: 'Acme' })).body
    const rtype = (await agent.post('/api/resource-types').send({ event_id: event.id, key: 't', label: 'Table', unit: 'table' })).body
    const booking = (await agent.post('/api/bookings').send({ event_id: event.id, participant_id: participant.id, discount_amount: 10 })).body

    await agent.post(`/api/bookings/${booking.id}/resources`).send({ resource_type_id: rtype.id, quantity: 3, unit_price: 40 })
    await agent.post(`/api/bookings/${booking.id}/resources`).send({ resource_type_id: rtype.id, quantity: 2, unit_price: 25 })

    const invoice = await agent.post('/api/invoices/generate').send({ booking_id: booking.id })
    expect(invoice.status).toBe(201)
    expect(invoice.body.total_amount).toBe('160.00') // (3*40 + 2*25) - 10

    const full = await agent.get(`/api/invoices/${invoice.body.id}`)
    expect(full.status).toBe(200)
    expect(full.body.lines).toHaveLength(2)
  })

  it('rejects a booking whose participant belongs to another event', async () => {
    const agent = await authedAdminAgent()
    const ev1 = (await agent.post('/api/events').send({ event_type_id: 1, name: 'E1' })).body
    const ev2 = (await agent.post('/api/events').send({ event_type_id: 1, name: 'E2' })).body
    const p2 = (await agent.post('/api/participants').send({ event_id: ev2.id, name: 'P2' })).body
    const res = await agent.post('/api/bookings').send({ event_id: ev1.id, participant_id: p2.id })
    expect(res.status).toBe(400)
  })
})
