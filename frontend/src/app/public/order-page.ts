import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import QRCode from 'qrcode'
import { PublicApi } from '../core/api'
import type { PublicOrderView } from '../core/models'

// Order lookup page (the crypto-random code in the URL is the bearer secret).
// After a Stripe redirect (?paid=1) it polls briefly while the webhook lands.
@Component({
  selector: 'app-public-order-page',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (notFound()) {
        <div class="pcard pad center">
          <h2>Order not found</h2>
          <p class="pmuted">Double-check the link from your confirmation email.</p>
          <a routerLink="/" class="pbtn ghost sm">← All events</a>
        </div>
      } @else if (view(); as v) {
        <div class="pcard pad head" [class.ok]="v.order.status === 'confirmed'">
          <div class="status-ico">{{ statusIcon(v.order.status) }}</div>
          <div>
            <h1>{{ statusTitle(v.order.status) }}</h1>
            <p class="pmuted">
              Order <span class="mono">{{ v.order.code }}</span> · {{ v.order.customer_name }}
              · {{ isFree() ? 'Free entry' : '€' + v.order.total_amount }}
            </p>
            @if (polling()) { <p class="pmuted poll">Waiting for payment confirmation…</p> }
          </div>
        </div>

        <a class="pcard pad event-line" [routerLink]="v.event.slug ? ['/events', v.event.slug] : ['/']">
          <div class="ev-thumb" [style.background-image]="v.event.hero_image_url ? 'url(' + v.event.hero_image_url + ')' : 'var(--pub-grad)'"></div>
          <div>
            <strong>{{ v.event.name }}</strong>
            <div class="pmuted sm">
              @if (v.event.start_date) { 📅 {{ v.event.start_date }}{{ v.event.end_date && v.event.end_date !== v.event.start_date ? ' → ' + v.event.end_date : '' }} }
              @if (v.event.venue) { · 📍 {{ v.event.venue }} }
            </div>
          </div>
        </a>

        @if (v.order.status === 'confirmed') {
          <h2 class="t-title">Your tickets</h2>
          <div class="tickets">
            @for (t of v.tickets; track t.id) {
              <div class="pcard ticket" [class.used]="t.status === 'checked_in'" [class.void]="t.status === 'cancelled'">
                <div class="t-left">
                  <strong>{{ t.ticket_type_name }}</strong>
                  @if (t.attendee_name) { <span class="pmuted">{{ t.attendee_name }}</span> }
                  <span class="mono code">{{ t.code }}</span>
                  @if (t.status === 'checked_in') { <span class="pchip">✓ checked in</span> }
                  @if (t.status === 'cancelled') { <span class="pchip">✕ cancelled</span> }
                </div>
                @if (qr()[t.code]; as src) { <img class="qr" [src]="src" alt="QR {{ t.code }}" /> }
              </div>
            }
          </div>
          <p class="pmuted fine">Show the QR codes at the entrance. They were also emailed to {{ v.order.customer_email }}.</p>
        } @else if (v.order.status === 'pending') {
          <div class="pcard pad pmuted">This order is awaiting payment. The page refreshes automatically once confirmed.</div>
        } @else {
          <div class="pcard pad pmuted">This order is {{ v.order.status }} — its tickets are no longer valid.</div>
        }
      } @else {
        <div class="pcard pad center pmuted">Loading…</div>
      }
    </div>
  `,
  styles: `
    .wrap { max-width: 720px; margin: 30px auto 0; padding: 0 max(20px, 4vw); display: flex; flex-direction: column; gap: 16px; }
    .pad { padding: 24px; }
    .center { text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center; margin-top: 40px; }
    .head { display: flex; align-items: center; gap: 18px; }
    .head.ok { border-color: rgba(52, 211, 153, 0.4); }
    .head h1 { font-size: 24px; }
    .status-ico { font-size: 38px; }
    .mono { font-family: monospace; letter-spacing: 1px; font-weight: 700; }
    .poll { font-size: 13px; animation: pulse 1.4s infinite; }
    @keyframes pulse { 50% { opacity: 0.45; } }
    .event-line { display: flex; align-items: center; gap: 14px; padding: 14px; transition: border-color 0.15s; }
    .event-line:hover { border-color: var(--pub-accent); }
    .ev-thumb { width: 76px; height: 52px; border-radius: 10px; background-size: cover; background-position: center; flex-shrink: 0; }
    .sm { font-size: 13px; }
    .t-title { font-size: 19px; margin-top: 6px; }
    .tickets { display: flex; flex-direction: column; gap: 12px; }
    .ticket { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 18px; }
    .ticket.used, .ticket.void { opacity: 0.55; }
    .t-left { display: flex; flex-direction: column; gap: 4px; }
    .code { font-size: 15px; }
    .qr { width: 110px; height: 110px; border-radius: 10px; background: #fff; padding: 6px; }
    .fine { font-size: 13px; text-align: center; margin-bottom: 30px; }
  `,
})
export class PublicOrderPage implements OnInit, OnDestroy {
  private api = inject(PublicApi)
  private route = inject(ActivatedRoute)

  readonly view = signal<PublicOrderView | null>(null)
  readonly notFound = signal(false)
  readonly qr = signal<Record<string, string>>({})
  readonly polling = signal(false)

  private code = ''
  private pollTimer: ReturnType<typeof setInterval> | null = null

  ngOnInit() {
    this.code = this.route.snapshot.paramMap.get('code') ?? ''
    this.load()
    // Back from Stripe: give the webhook a moment to confirm the order.
    if (this.route.snapshot.queryParamMap.get('paid') === '1') this.startPolling()
  }

  ngOnDestroy() {
    this.stopPolling()
  }

  private load() {
    this.api.order(this.code).subscribe({
      next: (v) => {
        this.view.set(v)
        if (v.order.status === 'confirmed') {
          this.stopPolling()
          void this.renderQrs(v)
        }
      },
      error: () => this.notFound.set(true),
    })
  }

  private startPolling() {
    this.polling.set(true)
    let attempts = 0
    this.pollTimer = setInterval(() => {
      attempts += 1
      if (attempts > 10 || this.view()?.order.status === 'confirmed') {
        this.stopPolling()
        return
      }
      // Actively verify with Stripe (covers slow webhooks), then refresh.
      this.api.verifyPayment(this.code).subscribe({
        next: () => this.load(),
        error: () => this.load(),
      })
    }, 3000)
  }

  private stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = null
    this.polling.set(false)
  }

  private async renderQrs(v: PublicOrderView) {
    const out: Record<string, string> = {}
    for (const t of v.tickets) {
      out[t.code] = await QRCode.toDataURL(t.code, { width: 220, margin: 1 })
    }
    this.qr.set(out)
  }

  isFree(): boolean {
    return Number(this.view()?.order.total_amount ?? 0) === 0
  }

  statusIcon(status: string): string {
    return status === 'confirmed' ? '🎟️' : status === 'pending' ? '⏳' : '✕'
  }

  statusTitle(status: string): string {
    if (status === 'confirmed') return "You're in!"
    if (status === 'pending') return 'Almost there…'
    if (status === 'expired') return 'Order expired'
    if (status === 'refunded') return 'Order refunded'
    return 'Order cancelled'
  }
}
