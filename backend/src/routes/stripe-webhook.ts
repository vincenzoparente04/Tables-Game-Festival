import type { Request, Response } from 'express'
import { constructWebhookEvent } from '../services/payments.service.js'
import * as orders from '../services/orders.service.js'

// Stripe webhook endpoint. Mounted in app.ts with express.raw() BEFORE the
// global express.json(), because signature verification needs the exact raw
// payload bytes. Both handled events are idempotent: Stripe retries are safe.
export async function stripeWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['stripe-signature']
  if (typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe signature' })
  }
  const event = constructWebhookEvent(req.body as Buffer, signature)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string }
    await orders.confirmOrderFromWebhook(session.id)
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object as { id: string }
    await orders.expireOrderFromWebhook(session.id)
  }
  // Unhandled event types still get a 200 so Stripe stops retrying them.
  res.json({ received: true })
}
