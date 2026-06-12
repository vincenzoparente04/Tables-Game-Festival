import Stripe from 'stripe'
import { AppError } from '../middleware/error-handler.js'

// Stripe Checkout integration. The whole platform works without keys: free
// orders never get here, and paid checkouts respond 503 until configured.

let cached: Stripe | null = null

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new AppError(503, 'Online payments are not configured')
  if (!cached) cached = new Stripe(key)
  return cached
}

export interface CheckoutLine {
  name: string
  unit_amount_cents: number
  quantity: number
}

// Amounts always come from DB prices — never from the client payload.
export async function createCheckoutSession(params: {
  order_code: string
  customer_email: string
  currency: string
  lines: CheckoutLine[]
  expires_at: Date
}): Promise<{ id: string; url: string }> {
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:4200'
  const session = await stripeClient().checkout.sessions.create({
    mode: 'payment',
    customer_email: params.customer_email,
    line_items: params.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: params.currency.toLowerCase(),
        unit_amount: line.unit_amount_cents,
        product_data: { name: line.name },
      },
    })),
    metadata: { order_code: params.order_code },
    expires_at: Math.floor(params.expires_at.getTime() / 1000),
    success_url: `${frontend}/orders/${params.order_code}?paid=1`,
    cancel_url: `${frontend}/orders/${params.order_code}?cancelled=1`,
  })
  if (!session.url) throw new AppError(502, 'Stripe did not return a checkout URL')
  return { id: session.id, url: session.url }
}

// Verifies the webhook signature against the exact raw payload bytes.
export function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new AppError(503, 'Stripe webhook is not configured')
  // Signature verification needs no API key — fall back to a placeholder
  // client so the webhook can be tested without STRIPE_SECRET_KEY.
  const client = isStripeEnabled() ? stripeClient() : new Stripe('sk_test_placeholder')
  try {
    return client.webhooks.constructEvent(payload, signature, secret)
  } catch {
    throw new AppError(400, 'Invalid Stripe webhook signature')
  }
}
