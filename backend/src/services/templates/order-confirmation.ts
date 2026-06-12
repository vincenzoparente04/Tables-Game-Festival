import QRCode from 'qrcode'
import type { MailMessage } from '../email.service.js'

// Order confirmation email with one inline QR per ticket. Clients that strip
// CID attachments still get the printed codes and the order-page link.

export interface ConfirmationEvent {
  name: string
  venue: string | null
  start_date: string | null
  end_date: string | null
}

export interface ConfirmationOrder {
  code: string
  customer_name: string
  customer_email: string
  total_amount: string
  currency: string
}

export interface ConfirmationTicket {
  code: string
  ticket_type_name: string
  attendee_name: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDates(event: ConfirmationEvent): string {
  if (!event.start_date) return ''
  return event.end_date && event.end_date !== event.start_date
    ? `${event.start_date} → ${event.end_date}`
    : event.start_date
}

export async function buildOrderConfirmation(
  event: ConfirmationEvent,
  order: ConfirmationOrder,
  tickets: ConfirmationTicket[],
): Promise<MailMessage> {
  const attachments = await Promise.all(
    tickets.map(async (ticket, i) => ({
      filename: `ticket-${ticket.code}.png`,
      content: await QRCode.toBuffer(ticket.code, { type: 'png', width: 240, margin: 1 }),
      cid: `ticket-${i}@event-platform`,
      contentType: 'image/png',
    })),
  )

  const frontend = process.env.FRONTEND_URL ?? ''
  const orderUrl = `${frontend}/orders/${order.code}`
  const total = Number(order.total_amount)
  const rows = tickets
    .map(
      (ticket, i) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e8e8ee;">
            <strong style="font-size:15px;">${escapeHtml(ticket.ticket_type_name)}</strong><br/>
            ${ticket.attendee_name ? `${escapeHtml(ticket.attendee_name)}<br/>` : ''}
            <span style="font-family:monospace;font-size:16px;letter-spacing:1px;">${ticket.code}</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #e8e8ee;text-align:right;">
            <img src="cid:ticket-${i}@event-platform" width="110" height="110" alt="QR ${ticket.code}"/>
          </td>
        </tr>`,
    )
    .join('')

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e;">
    <h1 style="font-size:22px;margin:24px 0 4px;">You're in! 🎟️</h1>
    <p style="margin:0 0 20px;color:#555;">
      Hi ${escapeHtml(order.customer_name)}, here ${tickets.length === 1 ? 'is your ticket' : `are your ${tickets.length} tickets`}
      for <strong>${escapeHtml(event.name)}</strong>.
    </p>
    <div style="background:#f6f7fb;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#555;">
        ${formatDates(event) ? `📅 ${formatDates(event)}<br/>` : ''}
        ${event.venue ? `📍 ${escapeHtml(event.venue)}<br/>` : ''}
        Order <strong style="font-family:monospace;">${order.code}</strong>
        ${total > 0 ? ` — total ${order.total_amount} ${escapeHtml(order.currency)}` : ' — free entry'}
      </p>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="margin:24px 0;">
      <a href="${orderUrl}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">
        View your order
      </a>
    </p>
    <p style="font-size:12px;color:#999;">Show the QR codes (or the ticket codes) at the entrance.</p>
  </div>`

  return {
    to: order.customer_email,
    subject: `Your tickets for ${event.name} — order ${order.code}`,
    html,
    attachments,
  }
}
