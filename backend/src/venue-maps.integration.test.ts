import { describe, it, expect, afterAll } from 'vitest'
import pool from './db/database.js'
import { authedAdminAgent, runDbTests } from './test-helpers/integration.js'

// D2 venue maps against a real Postgres (gated by RUN_DB_TESTS).
describe.skipIf(!runDbTests)('integration: venue maps (D2)', () => {
  afterAll(async () => {
    await pool.end()
  })

  it('creates a map from a template, bulk-replaces elements and sums capacity', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Map Fest' })).body
    const participant = (await agent.post('/api/participants').send({ event_id: event.id, name: 'Acme Stands' })).body
    const booking = (await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, kind: 'exhibitor',
    })).body

    // templates catalog is exposed
    const templates = await agent.get('/api/venue-templates')
    expect(templates.status).toBe(200)
    expect(templates.body.length).toBeGreaterThanOrEqual(11)

    // create from the park template: canvas + background are copied
    const created = await agent.post('/api/venue-maps').send({
      event_id: event.id, name: 'Festival Park', template_key: 'park',
    })
    expect(created.status).toBe(201)
    expect(created.body.width).toBe(1200)
    expect(created.body.background.length).toBeGreaterThan(0)
    const mapId = created.body.id

    expect((await agent.post('/api/venue-maps').send({
      event_id: event.id, name: 'Bad', template_key: 'nope',
    })).status).toBe(400)

    // first save: stage + 2 stands (one linked to the exhibitor booking) + bar
    const save1 = await agent.put(`/api/venue-maps/${mapId}/elements`).send({
      elements: [
        { kind: 'stage', label: 'Main Stage', x: 100, y: 80, width: 300, height: 150, capacity: 500 },
        { kind: 'stand', label: 'Stand A1', x: 500, y: 100, booking_id: booking.id, capacity: 20 },
        { kind: 'stand', label: 'Stand A2', x: 600, y: 100, capacity: 20 },
        { kind: 'bar', label: 'Main Bar', x: 900, y: 600, capacity: 60 },
      ],
    })
    expect(save1.status).toBe(200)
    expect(save1.body.elements).toHaveLength(4)
    expect(save1.body.capacity_summary.total).toBe(600)
    const linked = save1.body.elements.find((e: { booking_id: number | null }) => e.booking_id === booking.id)
    expect(linked.booking_participant_name).toBe('Acme Stands')

    // second save fully replaces the first
    const save2 = await agent.put(`/api/venue-maps/${mapId}/elements`).send({
      elements: [
        { kind: 'stage', label: 'Main Stage', x: 100, y: 80, capacity: 500 },
        { kind: 'wc', x: 1100, y: 700 },
      ],
    })
    expect(save2.status).toBe(200)
    expect(save2.body.elements).toHaveLength(2)
    expect(save2.body.capacity_summary.total).toBe(500)
    expect(save2.body.capacity_summary.by_kind).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'stage', count: 1, capacity: 500 })]),
    )
  })

  it('rejects links to entities of another event', async () => {
    const agent = await authedAdminAgent()
    const ev1 = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Map Ev1' })).body
    const ev2 = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Map Ev2' })).body
    const foreignArea = (await agent.post('/api/areas').send({ event_id: ev2.id, name: 'Foreign Hall' })).body
    const map = (await agent.post('/api/venue-maps').send({ event_id: ev1.id, name: 'Grounds' })).body

    const res = await agent.put(`/api/venue-maps/${map.id}/elements`).send({
      elements: [{ kind: 'stage', area_id: foreignArea.id }],
    })
    expect(res.status).toBe(400)
  })

  it('clears the link (not the element) when a linked resource is deleted', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Map FK Fest' })).body
    const rtype = (await agent.post('/api/resource-types').send({
      event_id: event.id, key: 'tbl', label: 'Table', unit: 'table',
    })).body
    const resource = (await agent.post('/api/resources').send({
      event_id: event.id, resource_type_id: rtype.id, label: 'Table T1', total_quantity: 1,
    })).body
    const map = (await agent.post('/api/venue-maps').send({ event_id: event.id, name: 'Hall plan' })).body
    await agent.put(`/api/venue-maps/${map.id}/elements`).send({
      elements: [{ kind: 'table', label: 'T1', resource_id: resource.id }],
    })

    await agent.delete(`/api/resources/${resource.id}`)
    const detail = (await agent.get(`/api/venue-maps/${map.id}`)).body
    expect(detail.elements).toHaveLength(1)
    expect(detail.elements[0].resource_id).toBeNull()
    expect(detail.elements[0].label).toBe('T1')
  })

  it('deleting the map cascades to its elements; maps are listed per event', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Map Cascade Fest' })).body
    const m1 = (await agent.post('/api/venue-maps').send({ event_id: event.id, name: 'Outdoor', template_key: 'park' })).body
    await agent.post('/api/venue-maps').send({ event_id: event.id, name: 'Pavilion', template_key: 'fair_pavilion' })
    await agent.put(`/api/venue-maps/${m1.id}/elements`).send({ elements: [{ kind: 'stage' }] })

    expect((await agent.get(`/api/venue-maps?event_id=${event.id}`)).body).toHaveLength(2)
    expect((await agent.delete(`/api/venue-maps/${m1.id}`)).status).toBe(200)
    expect((await agent.get(`/api/venue-maps/${m1.id}`)).status).toBe(404)
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM map_elements WHERE venue_map_id = $1', [m1.id])
    expect(rows[0].n).toBe(0)
  })
})
