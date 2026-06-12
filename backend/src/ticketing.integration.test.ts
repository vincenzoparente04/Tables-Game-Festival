import { describe, it, expect, afterAll } from 'vitest'
import Stripe from 'stripe'
import pool from './db/database.js'
import { authedAdminAgent, runDbTests } from './test-helpers/integration.js'
import { sentMailsForTesting } from './services/email.service.js'

// D3 ticketing against a real Postgres (gated by RUN_DB_TESTS).
// EMAIL_PROVIDER defaults to console, which records into sentMailsForTesting.

type Agent = Awaited<ReturnType<typeof authedAdminAgent>>

async function createPublishedEvent(agent: Agent, name: string, extra: Record<string, unknown> = {}) {
  const res = await agent.post('/api/events').send({ event_type_id: 3, name, status: 'published', ...extra })
  return res.body
}

describe.skipIf(!runDbTests)('integration: ticketing (D3)', () => {
  afterAll(async () => {
    await pool.end()
  })

  it('completes the free-order flow: order, email, lookup, availability, check-in', async () => {
    const agent = await authedAdminAgent()
    const event = await createPublishedEvent(agent, 'Free Fest D3')
    const type = (await agent.post('/api/ticket-types').send({
      event_id: event.id, name: 'Free entry', capacity: 100,
    })).body

    const mailsBefore = sentMailsForTesting.length
    const created = await agent.post('/api/public/orders').send({
      event_id: event.id, customer_name: 'Vis Itor', customer_email: 'vis@example.com',
      items: [{ ticket_type_id: type.id, quantity: 2, attendee_names: ['Anna'] }],
    })
    expect(created.status).toBe(201)
    expect(created.body.order.status).toBe('confirmed')
    expect(created.body.order.total_amount).toBe('0.00')
    expect(created.body.checkout_url).toBeUndefined()
    expect(created.body.tickets).toHaveLength(2)
    expect(created.body.tickets[0].code).toHaveLength(12)
    expect(created.body.tickets[0].attendee_name).toBe('Anna')
    expect(sentMailsForTesting.length).toBe(mailsBefore + 1)
    expect(sentMailsForTesting.at(-1)!.to).toBe('vis@example.com')
    expect(sentMailsForTesting.at(-1)!.attachments).toHaveLength(2)

    // public lookup by order code
    const view = await agent.get(`/api/public/orders/${created.body.order.code}`)
    expect(view.status).toBe(200)
    expect(view.body.tickets).toHaveLength(2)
    expect(view.body.event.name).toBe('Free Fest D3')

    // remaining availability reflects the sale
    const avail = (await agent.get(`/api/public/events/${event.slug}/ticket-types`)).body
    expect(avail[0].available).toBe(98)

    // staff list + detail
    const list = (await agent.get(`/api/orders?event_id=${event.id}`)).body
    expect(list).toHaveLength(1)
    expect(list[0].tickets_count).toBe(2)

    // check-in: once OK, twice 409, unknown 404
    const ticketCode = created.body.tickets[0].code
    const checkin = await agent.post('/api/orders/check-in').send({ code: ticketCode })
    expect(checkin.status).toBe(200)
    expect(checkin.body.ticket.status).toBe('checked_in')
    expect((await agent.post('/api/orders/check-in').send({ code: ticketCode })).status).toBe(409)
    expect((await agent.post('/api/orders/check-in').send({ code: 'NOPECODE9999' })).status).toBe(404)
  })

  it('enforces per-type and event-level capacity', async () => {
    const agent = await authedAdminAgent()
    const event = await createPublishedEvent(agent, 'Cap Fest D3')
    const type = (await agent.post('/api/ticket-types').send({
      event_id: event.id, name: 'Limited', capacity: 2,
    })).body
    const buy = (qty: number) => agent.post('/api/public/orders').send({
      event_id: event.id, customer_name: 'B', customer_email: 'b@example.com',
      items: [{ ticket_type_id: type.id, quantity: qty }],
    })
    expect((await buy(3)).status).toBe(409)
    expect((await buy(2)).status).toBe(201)
    expect((await buy(1)).status).toBe(409)

    // event-level capacity caps an otherwise unlimited tier
    const ev2 = await createPublishedEvent(agent, 'Cap Fest D3 bis', { capacity: 2 })
    const open = (await agent.post('/api/ticket-types').send({ event_id: ev2.id, name: 'Open' })).body
    const buy2 = (qty: number) => agent.post('/api/public/orders').send({
      event_id: ev2.id, customer_name: 'B', customer_email: 'b@example.com',
      items: [{ ticket_type_id: open.id, quantity: qty }],
    })
    expect((await buy2(2)).status).toBe(201)
    expect((await buy2(1)).status).toBe(409)
  })

  it('pending orders hold capacity until they expire', async () => {
    const agent = await authedAdminAgent()
    const event = await createPublishedEvent(agent, 'Hold Fest D3')
    const type = (await agent.post('/api/ticket-types').send({
      event_id: event.id, name: 'Hold', capacity: 2,
    })).body

    // simulate a paid order still waiting for its webhook
    const pendingRes = await pool.query<{ id: number }>(
      `INSERT INTO orders (event_id, code, customer_name, customer_email, status, total_amount,
                           payment_provider, payment_ref, expires_at)
       VALUES ($1, 'HOLDD3CODE', 'P', 'p@example.com', 'pending', 10, 'stripe', 'cs_test_hold_d3',
               now() + interval '10 minutes')
       RETURNING id`,
      [event.id],
    )
    const pendingId = pendingRes.rows[0]!.id
    await pool.query(
      `INSERT INTO tickets (order_id, ticket_type_id, code) VALUES ($1, $2, 'HOLDD3TICK1')`,
      [pendingId, type.id],
    )

    const buy = (qty: number) => agent.post('/api/public/orders').send({
      event_id: event.id, customer_name: 'B', customer_email: 'b@example.com',
      items: [{ ticket_type_id: type.id, quantity: qty }],
    })
    expect((await buy(2)).status).toBe(409) // 1 held + 2 requested > 2
    expect((await buy(1)).status).toBe(201)

    // once expired, the held seat frees up (lazy sweep inside the order tx)
    await pool.query(`UPDATE orders SET expires_at = now() - interval '1 minute' WHERE id = $1`, [pendingId])
    expect((await buy(1)).status).toBe(201)
  })

  it('rejects paid orders without Stripe keys; draft events are invisible to checkout', async () => {
    const agent = await authedAdminAgent()
    const event = await createPublishedEvent(agent, 'Paid Fest D3')
    const paid = (await agent.post('/api/ticket-types').send({
      event_id: event.id, name: 'Standard', price: 25,
    })).body
    expect((await agent.post('/api/public/orders').send({
      event_id: event.id, customer_name: 'B', customer_email: 'b@example.com',
      items: [{ ticket_type_id: paid.id, quantity: 1 }],
    })).status).toBe(503)

    const draft = (await agent.post('/api/events').send({ event_type_id: 3, name: 'Draft Fest D3' })).body
    const dtype = (await agent.post('/api/ticket-types').send({ event_id: draft.id, name: 'Free' })).body
    expect((await agent.post('/api/public/orders').send({
      event_id: draft.id, customer_name: 'B', customer_email: 'b@example.com',
      items: [{ ticket_type_id: dtype.id, quantity: 1 }],
    })).status).toBe(404)
  })

  it('confirms a pending order through a signed Stripe webhook, idempotently', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_d3'
    const agent = await authedAdminAgent()
    const event = await createPublishedEvent(agent, 'Webhook Fest D3')
    const type = (await agent.post('/api/ticket-types').send({
      event_id: event.id, name: 'Paid', price: 10,
    })).body
    const pendingRes = await pool.query<{ id: number }>(
      `INSERT INTO orders (event_id, code, customer_name, customer_email, status, total_amount,
                           payment_provider, payment_ref, expires_at)
       VALUES ($1, 'WEBHKD3CODE', 'W', 'w@example.com', 'pending', 10, 'stripe', 'cs_test_web_d3',
               now() + interval '30 minutes')
       RETURNING id`,
      [event.id],
    )
    await pool.query(
      `INSERT INTO tickets (order_id, ticket_type_id, code) VALUES ($1, $2, 'WEBHKD3TICK')`,
      [pendingRes.rows[0]!.id, type.id],
    )

    const payload = JSON.stringify({
      id: 'evt_test_d3', object: 'event', type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_web_d3' } },
    })
    const stripe = new Stripe('sk_test_placeholder')
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_d3' })
    const mailsBefore = sentMailsForTesting.length

    const hook = await agent.post('/api/stripe/webhook')
      .set('stripe-signature', signature).set('content-type', 'application/json').send(payload)
    expect(hook.status).toBe(200)
    expect((await agent.get('/api/public/orders/WEBHKD3CODE')).body.order.status).toBe('confirmed')
    expect(sentMailsForTesting.length).toBe(mailsBefore + 1)

    // replay: still 200, still confirmed, no second email
    const replay = await agent.post('/api/stripe/webhook')
      .set('stripe-signature', signature).set('content-type', 'application/json').send(payload)
    expect(replay.status).toBe(200)
    expect(sentMailsForTesting.length).toBe(mailsBefore + 1)

    // tampered payload fails signature verification
    const bad = await agent.post('/api/stripe/webhook')
      .set('stripe-signature', signature).set('content-type', 'application/json')
      .send(payload.replace('cs_test_web_d3', 'cs_test_evil'))
    expect(bad.status).toBe(400)
  })

  it('cancelling an order voids its tickets and frees capacity', async () => {
    const agent = await authedAdminAgent()
    const event = await createPublishedEvent(agent, 'Cancel Fest D3')
    const type = (await agent.post('/api/ticket-types').send({
      event_id: event.id, name: 'One seat', capacity: 1,
    })).body
    const buy = () => agent.post('/api/public/orders').send({
      event_id: event.id, customer_name: 'C', customer_email: 'c@example.com',
      items: [{ ticket_type_id: type.id, quantity: 1 }],
    })
    const first = (await buy()).body
    expect((await buy()).status).toBe(409)
    // a tier with sold tickets cannot be deleted (friendly 409, not a raw FK error)
    expect((await agent.delete(`/api/ticket-types/${type.id}`)).status).toBe(409)

    const orderId = (await agent.get(`/api/orders?event_id=${event.id}`)).body[0].id
    expect((await agent.patch(`/api/orders/${orderId}/cancel`)).status).toBe(200)
    expect((await agent.post('/api/orders/check-in').send({ code: first.tickets[0].code })).status).toBe(409)
    expect((await buy()).status).toBe(201)
  })
})
