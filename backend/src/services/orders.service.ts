import { AppError } from '../middleware/error-handler.js'
import * as repo from '../repositories/orders.repo.js'
import type { OrderRow, TicketDetailRow, TicketRow } from '../repositories/orders.repo.js'
import * as ticketTypesRepo from '../repositories/ticket-types.repo.js'
import { getEventById } from '../repositories/events.repo.js'
import { isStripeEnabled, createCheckoutSession, getCheckoutPaymentStatus } from './payments.service.js'
import { sendMail } from './email.service.js'
import { buildOrderConfirmation } from './templates/order-confirmation.js'
import { shortCode } from './short-code.js'

// Pending (unpaid) orders hold capacity for this long; the matching Stripe
// Checkout session expires a bit earlier so the webhook settles first.
const ORDER_EXPIRY_MINUTES = 35
const CHECKOUT_EXPIRY_MINUTES = 31

export interface PublicOrderItem {
  ticket_type_id: number
  quantity: number
  attendee_names?: string[]
}

export interface CreatePublicOrderInput {
  event_id: number
  customer_name: string
  customer_email: string
  items: PublicOrderItem[]
}

export interface PublicOrderResult {
  order: OrderRow
  tickets: TicketRow[]
  checkout_url?: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

async function sendConfirmationSafely(eventId: number, order: OrderRow): Promise<void> {
  try {
    const [event, tickets] = await Promise.all([getEventById(eventId), repo.getOrderTickets(order.id)])
    if (!event) return
    await sendMail(await buildOrderConfirmation(event, order, tickets))
  } catch (err) {
    // The order stands even if the email fails — the order page has the QRs.
    console.error(`Order confirmation email failed for order ${order.code}:`, err)
  }
}

export async function createPublicOrder(input: CreatePublicOrderInput): Promise<PublicOrderResult> {
  const event = await getEventById(input.event_id)
  if (!event || !event.is_active || event.status !== 'published') {
    throw new AppError(404, 'Event not found')
  }

  const typeIds = input.items.map((i) => i.ticket_type_id)
  const types = await ticketTypesRepo.getTicketTypesByIds(typeIds)
  const typeById = new Map(types.map((t) => [t.id, t]))
  const now = Date.now()

  let total = 0
  let currency: string | null = null
  const ticketSpecs: repo.NewTicketSpec[] = []
  for (const item of input.items) {
    const type = typeById.get(item.ticket_type_id)
    if (!type || type.event_id !== event.id || type.status !== 'on_sale') {
      throw new AppError(400, 'Ticket type is not available')
    }
    if (type.sales_start_at && new Date(type.sales_start_at).getTime() > now) {
      throw new AppError(400, `Sales for "${type.name}" have not started yet`)
    }
    if (type.sales_end_at && new Date(type.sales_end_at).getTime() <= now) {
      throw new AppError(400, `Sales for "${type.name}" have ended`)
    }
    if (item.quantity > type.max_per_order) {
      throw new AppError(400, `At most ${type.max_per_order} "${type.name}" tickets per order`)
    }
    if (currency !== null && currency !== type.currency) {
      throw new AppError(400, 'All tickets in an order must use the same currency')
    }
    currency = type.currency
    total += Number(type.price) * item.quantity
    for (let i = 0; i < item.quantity; i++) {
      const attendee = item.attendee_names?.[i]
      ticketSpecs.push({
        ticket_type_id: type.id,
        code: shortCode(12),
        ...(attendee !== undefined ? { attendee_name: attendee } : {}),
      })
    }
  }
  total = round2(total)

  const isFree = total === 0
  if (!isFree && !isStripeEnabled()) {
    throw new AppError(503, 'Online payments are not configured for this event yet')
  }

  // Retry on the (astronomically rare) short-code collision.
  let result: repo.CreateOrderTxResult | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await repo.createOrderWithTickets({
        event_id: event.id,
        code: shortCode(10),
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        status: isFree ? 'confirmed' : 'pending',
        total_amount: total,
        currency: currency ?? 'EUR',
        payment_provider: isFree ? 'none' : 'stripe',
        expires_at: isFree ? null : new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60_000).toISOString(),
        tickets: ticketSpecs.map((t) => ({ ...t, code: attempt === 0 ? t.code : shortCode(12) })),
      })
      break
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined
      if (code !== '23505' || attempt === 2) throw err
    }
  }
  if (!result) throw new AppError(500, 'Order creation failed')
  if (!result.ok) {
    if (result.reason === 'event_capacity') throw new AppError(409, 'The event is sold out')
    const type = typeById.get(result.ticket_type_id)
    throw new AppError(409, `Not enough availability for "${type?.name ?? 'the selected ticket'}"`)
  }

  if (isFree) {
    await sendConfirmationSafely(event.id, result.order)
    return { order: result.order, tickets: result.tickets }
  }

  // Paid: open a Stripe Checkout session; the webhook confirms the order.
  try {
    const session = await createCheckoutSession({
      order_code: result.order.code,
      customer_email: input.customer_email,
      currency: currency ?? 'EUR',
      lines: input.items.map((item) => {
        const type = typeById.get(item.ticket_type_id)!
        return {
          name: `${event.name} — ${type.name}`,
          unit_amount_cents: Math.round(Number(type.price) * 100),
          quantity: item.quantity,
        }
      }),
      expires_at: new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60_000),
    })
    await repo.setPaymentRef(result.order.id, session.id)
    return {
      order: { ...result.order, payment_ref: session.id },
      tickets: result.tickets,
      checkout_url: session.url,
    }
  } catch (err) {
    await repo.cancelOrder(result.order.id) // free the held capacity
    if (err instanceof AppError) throw err
    console.error('Stripe checkout session creation failed:', err)
    throw new AppError(502, 'Failed to start the payment session')
  }
}

export interface PublicOrderView {
  order: OrderRow
  tickets: TicketDetailRow[]
  event: {
    id: number
    name: string
    slug: string | null
    venue: string | null
    location_address: string | null
    hero_image_url: string | null
    start_date: string | null
    end_date: string | null
    start_time: string | null
  }
}

export async function getPublicOrder(code: string): Promise<PublicOrderView> {
  let order = await repo.getOrderByCode(code)
  if (!order) throw new AppError(404, 'Order not found')
  if (order.status === 'pending' && order.expires_at && new Date(order.expires_at).getTime() <= Date.now()) {
    await repo.expireStaleOrders(order.event_id)
    order = (await repo.getOrderByCode(code))!
  }
  const [tickets, event] = await Promise.all([repo.getOrderTickets(order.id), getEventById(order.event_id)])
  if (!event) throw new AppError(404, 'Order not found')
  return {
    order,
    tickets,
    event: {
      id: event.id,
      name: event.name,
      slug: event.slug,
      venue: event.venue,
      location_address: event.location_address,
      hero_image_url: event.hero_image_url,
      start_date: event.start_date,
      end_date: event.end_date,
      start_time: event.start_time,
    },
  }
}

export async function listOrders(eventId?: number, status?: string) {
  await repo.expireStaleOrders(eventId)
  return repo.listOrders(eventId, status)
}

export async function getOrderDetail(id: number): Promise<OrderRow & { tickets: TicketDetailRow[] }> {
  const order = await repo.getOrderById(id)
  if (!order) throw new AppError(404, 'Order not found')
  return { ...order, tickets: await repo.getOrderTickets(order.id) }
}

export async function cancelOrder(id: number): Promise<OrderRow> {
  const existing = await repo.getOrderById(id)
  if (!existing) throw new AppError(404, 'Order not found')
  const cancelled = await repo.cancelOrder(id)
  if (!cancelled) throw new AppError(409, `Order is ${existing.status} and cannot be cancelled`)
  return cancelled
}

export interface CheckInResult {
  ticket: TicketRow
  ticket_type_name: string
  order_code: string
  customer_name: string
  event_id: number
}

export async function checkInByCode(code: string): Promise<CheckInResult> {
  const ticket = await repo.getTicketByCode(code)
  if (!ticket) throw new AppError(404, 'Ticket not found')
  if (ticket.status === 'checked_in') {
    throw new AppError(409, `Ticket already checked in at ${ticket.checked_in_at}`)
  }
  if (ticket.status === 'cancelled') throw new AppError(409, 'Ticket is cancelled')
  if (ticket.order_status !== 'confirmed') {
    throw new AppError(409, `Order is ${ticket.order_status}, not confirmed`)
  }
  const updated = await repo.checkInTicket(ticket.id)
  if (!updated) throw new AppError(409, 'Ticket was already checked in')
  return {
    ticket: updated,
    ticket_type_name: ticket.ticket_type_name,
    order_code: ticket.order_code,
    customer_name: ticket.customer_name,
    event_id: ticket.event_id,
  }
}

// Belt-and-braces for delayed webhooks: the order page can actively ask
// Stripe whether the session was paid. Idempotent — a confirmed order
// returns immediately without touching Stripe.
export async function verifyPayment(code: string): Promise<OrderRow> {
  const order = await repo.getOrderByCode(code)
  if (!order) throw new AppError(404, 'Order not found')
  if (order.status !== 'pending') return order
  if (!order.payment_ref || order.payment_provider !== 'stripe') {
    throw new AppError(400, 'Order has no payment session to verify')
  }
  const status = await getCheckoutPaymentStatus(order.payment_ref) // 503 without Stripe keys
  if (status === 'paid') {
    return (await confirmOrderFromWebhook(order.payment_ref)) ?? order
  }
  if (status === 'expired') {
    return (await repo.expireByPaymentRef(order.payment_ref)) ?? order
  }
  return order
}

// Webhook entry points — both idempotent (replays match 0 rows and no-op).
export async function confirmOrderFromWebhook(paymentRef: string): Promise<OrderRow | null> {
  const order = await repo.confirmByPaymentRef(paymentRef)
  if (order) await sendConfirmationSafely(order.event_id, order)
  return order
}

export async function expireOrderFromWebhook(paymentRef: string): Promise<OrderRow | null> {
  return repo.expireByPaymentRef(paymentRef)
}
