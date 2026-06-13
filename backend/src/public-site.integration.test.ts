import { describe, it, expect, afterAll } from 'vitest'
import pool from './db/database.js'
import { authedAdminAgent, runDbTests } from './test-helpers/integration.js'

// Phase G public projections (gated by RUN_DB_TESTS).
describe.skipIf(!runDbTests)('integration: public site projections (G)', () => {
  afterAll(async () => {
    await pool.end()
  })

  it('exposes lineup, images, public schedule and a safe map projection', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({
      event_type_id: 3, name: 'Public Site Fest', status: 'published', subtitle: 'Two nights of art',
    })).body
    expect(event.slug).toBe('public-site-fest')

    // lineup
    const artist = (await agent.post('/api/artists').send({ name: 'Lumen Duo', kind: 'band' })).body
    await agent.post('/api/event-artists').send({ event_id: event.id, artist_id: artist.id, is_headliner: true })

    // gallery image (plain URL — no Cloudinary involved)
    await agent.post('/api/event-images').send({ event_id: event.id, url: 'https://picsum.photos/seed/g/800/600' })

    // schedule: one visible, one cancelled, one hidden
    const area = (await agent.post('/api/areas').send({ event_id: event.id, name: 'Main Stage', kind: 'stage' })).body
    await agent.post('/api/schedule-slots').send({
      event_id: event.id, area_id: area.id, artist_id: artist.id, title: 'Live set',
      starts_at: '2026-08-01T20:00:00.000Z', ends_at: '2026-08-01T22:00:00.000Z',
    })
    await agent.post('/api/schedule-slots').send({
      event_id: event.id, title: 'Cancelled set', status: 'cancelled',
      starts_at: '2026-08-01T22:00:00.000Z', ends_at: '2026-08-01T23:00:00.000Z',
    })
    await agent.post('/api/schedule-slots').send({
      event_id: event.id, title: 'Internal soundcheck', is_public: false,
      starts_at: '2026-08-01T18:00:00.000Z', ends_at: '2026-08-01T19:00:00.000Z',
    })

    // map: linked element label resolves to the participant, ids stay hidden
    const participant = (await agent.post('/api/participants').send({ event_id: event.id, name: 'Acme Art' })).body
    const booking = (await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, kind: 'exhibitor',
    })).body
    const map = (await agent.post('/api/venue-maps').send({
      event_id: event.id, name: 'Grounds', template_key: 'park',
    })).body
    await agent.put(`/api/venue-maps/${map.id}/elements`).send({
      elements: [
        { kind: 'stage', label: 'Main Stage', capacity: 300 },
        { kind: 'stand', booking_id: booking.id },
      ],
    })

    // --- public views (no auth assumptions; admin agent is fine) ---
    const detail = (await agent.get('/api/public/events/public-site-fest')).body
    expect(detail.subtitle).toBe('Two nights of art')
    expect(detail.lineup).toHaveLength(1)
    expect(detail.lineup[0].name).toBe('Lumen Duo')
    expect(detail.lineup[0].is_headliner).toBe(true)
    expect(detail.images).toHaveLength(1)

    const schedule = (await agent.get('/api/public/events/public-site-fest/schedule')).body
    expect(schedule).toHaveLength(1)
    expect(schedule[0].title).toBe('Live set')
    expect(schedule[0].area_name).toBe('Main Stage')

    const publicMap = (await agent.get('/api/public/events/public-site-fest/map')).body
    expect(publicMap.name).toBe('Grounds')
    expect(publicMap.background.length).toBeGreaterThan(0)
    expect(publicMap.elements).toHaveLength(2)
    const stand = publicMap.elements.find((e: { kind: string }) => e.kind === 'stand')
    expect(stand.label).toBe('Acme Art') // resolved server-side
    expect(stand.booking_id).toBeUndefined() // internal ids never exposed
    expect(stand.resource_id).toBeUndefined()

    // a hidden map is not served
    await agent.put(`/api/venue-maps/${map.id}`).send({ is_public: false })
    expect((await agent.get('/api/public/events/public-site-fest/map')).status).toBe(404)

    // drafts stay invisible on every public endpoint
    const draft = (await agent.post('/api/events').send({ event_type_id: 3, name: 'Hidden Fest G', slug: 'hidden-fest-g' })).body
    expect(draft.status).toBe('draft')
    expect((await agent.get('/api/public/events/hidden-fest-g')).status).toBe(404)
    expect((await agent.get('/api/public/events/hidden-fest-g/schedule')).status).toBe(404)
  })
})
