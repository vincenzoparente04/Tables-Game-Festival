import { describe, it, expect, afterAll } from 'vitest'
import pool from './db/database.js'
import { authedAdminAgent, runDbTests } from './test-helpers/integration.js'

// D1 domain foundation against a real Postgres (gated by RUN_DB_TESTS).
// Event type ids come from the seed migration: 1=festival, 3=concert, 6=art_exhibition.
describe.skipIf(!runDbTests)('integration: arts domain (D1)', () => {
  afterAll(async () => {
    await pool.end()
  })

  it('manages the artist catalog and the event lineup', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 3, name: 'Lineup Fest' })).body

    const a1 = await agent.post('/api/artists').send({
      name: 'The Nebulas', kind: 'band', links: { website: 'https://nebulas.example.com' },
    })
    expect(a1.status).toBe(201)
    const a2 = (await agent.post('/api/artists').send({ name: 'Aria Vox', kind: 'musician' })).body

    const l1 = await agent.post('/api/event-artists').send({
      event_id: event.id, artist_id: a1.body.id, display_order: 2,
    })
    expect(l1.status).toBe(201)
    const l2 = (await agent.post('/api/event-artists').send({
      event_id: event.id, artist_id: a2.id, is_headliner: true,
    })).body

    const list = (await agent.get(`/api/event-artists?event_id=${event.id}`)).body
    expect(list).toHaveLength(2)
    expect(list[0].artist_id).toBe(a2.id) // headliner first
    expect(list[0].artist_name).toBe('Aria Vox')

    // the same artist cannot appear twice in a lineup
    const dup = await agent.post('/api/event-artists').send({ event_id: event.id, artist_id: a2.id })
    expect(dup.status).toBe(409)

    expect((await agent.delete(`/api/event-artists/${l2.id}`)).status).toBe(200)
    expect((await agent.get(`/api/event-artists?event_id=${event.id}`)).body).toHaveLength(1)
  })

  it('flags duplicate open agreements of the same kind, allows different kinds', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Agreement Fest' })).body
    const participant = (await agent.post('/api/participants').send({
      event_id: event.id, name: 'SoundTech Srl', participant_type: 'provider',
    })).body

    const v1 = await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, kind: 'vendor',
    })
    expect(v1.status).toBe(201)
    expect(v1.body.kind).toBe('vendor')
    expect(v1.body.warnings).toEqual([])

    // a different kind for the same participant is clean
    const s1 = await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, kind: 'sponsor',
    })
    expect(s1.status).toBe(201)
    expect(s1.body.warnings).toEqual([])

    // a second open agreement of the same kind is created but flagged
    const v2 = await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, kind: 'vendor',
    })
    expect(v2.status).toBe(201)
    expect(v2.body.warnings).toHaveLength(1)

    // once both vendor agreements reach a terminal stage, no more warnings
    const stages = (await agent.get(`/api/events/${event.id}/pipeline`)).body as {
      id: number
      is_terminal: boolean
    }[]
    const terminal = stages.find((s) => s.is_terminal)!
    await agent.put(`/api/bookings/${v1.body.id}`).send({ stage_id: terminal.id })
    await agent.put(`/api/bookings/${v2.body.id}`).send({ stage_id: terminal.id })
    const v3 = await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, kind: 'vendor',
    })
    expect(v3.status).toBe(201)
    expect(v3.body.warnings).toEqual([])

    const vendors = (await agent.get(`/api/bookings?event_id=${event.id}&kind=vendor`)).body
    expect(vendors).toHaveLength(3)
    expect((await agent.get(`/api/bookings?event_id=${event.id}&kind=nope`)).status).toBe(400)
  })

  it('warns on schedule conflicts (same area / same artist), not on touching edges', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 3, name: 'Schedule Fest' })).body
    const main = (await agent.post('/api/areas').send({ event_id: event.id, name: 'Main Stage', kind: 'stage' })).body
    const club = (await agent.post('/api/areas').send({ event_id: event.id, name: 'Club Stage', kind: 'stage' })).body
    const artist = (await agent.post('/api/artists').send({ name: 'DJ Overlap', kind: 'dj' })).body

    const s1 = await agent.post('/api/schedule-slots').send({
      event_id: event.id, area_id: main.id, artist_id: artist.id, title: 'Opening set',
      starts_at: '2026-07-01T20:00:00.000Z', ends_at: '2026-07-01T22:00:00.000Z',
    })
    expect(s1.status).toBe(201)
    expect(s1.body.warnings).toEqual([])

    // touching edge on the same stage: clean
    const s2 = await agent.post('/api/schedule-slots').send({
      event_id: event.id, area_id: main.id, title: 'Closing',
      starts_at: '2026-07-01T22:00:00.000Z', ends_at: '2026-07-01T23:30:00.000Z',
    })
    expect(s2.status).toBe(201)
    expect(s2.body.warnings).toEqual([])

    // overlaps both existing slots in the same area
    const s3 = await agent.post('/api/schedule-slots').send({
      event_id: event.id, area_id: main.id, title: 'Guest jam',
      starts_at: '2026-07-01T21:00:00.000Z', ends_at: '2026-07-01T23:00:00.000Z',
    })
    expect(s3.status).toBe(201)
    expect(s3.body.warnings).toHaveLength(2)

    // same artist on another stage at an overlapping time
    const s4 = await agent.post('/api/schedule-slots').send({
      event_id: event.id, area_id: club.id, artist_id: artist.id, title: 'Secret set',
      starts_at: '2026-07-01T21:30:00.000Z', ends_at: '2026-07-01T22:30:00.000Z',
    })
    expect(s4.status).toBe(201)
    expect(s4.body.warnings).toHaveLength(1)

    // basic integrity: reversed times and foreign areas are rejected
    const reversed = await agent.post('/api/schedule-slots').send({
      event_id: event.id, title: 'Backwards',
      starts_at: '2026-07-01T22:00:00.000Z', ends_at: '2026-07-01T21:00:00.000Z',
    })
    expect(reversed.status).toBe(400)
    const other = (await agent.post('/api/events').send({ event_type_id: 3, name: 'Other Fest' })).body
    const foreignArea = (await agent.post('/api/areas').send({ event_id: other.id, name: 'Elsewhere' })).body
    const crossEvent = await agent.post('/api/schedule-slots').send({
      event_id: event.id, area_id: foreignArea.id, title: 'Wrong venue',
      starts_at: '2026-07-01T20:00:00.000Z', ends_at: '2026-07-01T21:00:00.000Z',
    })
    expect(crossEvent.status).toBe(400)
  })

  it('tracks expenses and computes the event finance overview', async () => {
    const agent = await authedAdminAgent()
    const event = (await agent.post('/api/events').send({ event_type_id: 1, name: 'Finance Fest' })).body
    const participant = (await agent.post('/api/participants').send({ event_id: event.id, name: 'Espositore SpA' })).body
    const rtype = (await agent.post('/api/resource-types').send({
      event_id: event.id, key: 'booth', label: 'Booth', unit: 'sqm',
    })).body
    const booking = (await agent.post('/api/bookings').send({
      event_id: event.id, participant_id: participant.id, discount_amount: 10,
    })).body
    await agent.post(`/api/bookings/${booking.id}/resources`).send({ resource_type_id: rtype.id, quantity: 3, unit_price: 40 })
    await agent.post(`/api/bookings/${booking.id}/resources`).send({ resource_type_id: rtype.id, quantity: 2, unit_price: 25 })
    await agent.post('/api/invoices/generate').send({ booking_id: booking.id }) // 160.00 issued

    const paidExpense = await agent.post('/api/expenses').send({
      event_id: event.id, category: 'security', description: 'Night security', amount: 50, status: 'paid',
    })
    expect(paidExpense.status).toBe(201)
    expect(paidExpense.body.paid_at).toBeTruthy()
    await agent.post('/api/expenses').send({
      event_id: event.id, category: 'bar', description: 'Beer kegs', amount: 30,
    })

    const finance = (await agent.get(`/api/events/${event.id}/finance`)).body
    expect(finance.income.invoiced).toBe(160)
    expect(finance.income.paid).toBe(0)
    expect(finance.expenses.paid).toBe(50)
    expect(finance.expenses.planned).toBe(30)
    expect(finance.expenses.total).toBe(80)
    expect(finance.net_projected).toBe(80)
    expect(finance.net_paid).toBe(-50)
    const categories = finance.expenses_by_category.map((c: { category: string }) => c.category)
    expect(categories).toContain('security')
    expect(categories).toContain('bar')

    // un-paying an expense clears paid_at
    const reverted = (await agent.put(`/api/expenses/${paidExpense.body.id}`).send({ status: 'committed' })).body
    expect(reverted.paid_at).toBeNull()
  })

  it('auto-generates a unique slug on publish and keeps a single featured event', async () => {
    const agent = await authedAdminAgent()
    const ev1 = (await agent.post('/api/events').send({ event_type_id: 6, name: 'Slug Twin Expo' })).body
    expect(ev1.slug).toBeNull()
    expect(ev1.status).toBe('draft')

    const pub1 = (await agent.put(`/api/events/${ev1.id}`).send({ status: 'published' })).body
    expect(pub1.slug).toBe('slug-twin-expo')

    // publishing a second event with the same name suffixes the slug
    const ev2 = (await agent.post('/api/events').send({
      event_type_id: 6, name: 'Slug Twin Expo', status: 'published',
    })).body
    expect(ev2.slug).toBe('slug-twin-expo-2')

    // featured is exclusive: featuring ev2 un-features ev1
    await agent.patch(`/api/events/${ev1.id}/set-featured`)
    const f2 = (await agent.patch(`/api/events/${ev2.id}/set-featured`)).body
    expect(f2.is_featured).toBe(true)
    const ev1After = (await agent.get(`/api/events/${ev1.id}`)).body
    expect(ev1After.is_featured).toBe(false)

    // the public showcase only lists published events
    const pub = await agent.get('/api/public/events')
    expect(pub.status).toBe(200)
    const slugs = pub.body.map((e: { slug: string | null }) => e.slug)
    expect(slugs).toContain('slug-twin-expo')
    expect(slugs).toContain('slug-twin-expo-2')
  })
})
