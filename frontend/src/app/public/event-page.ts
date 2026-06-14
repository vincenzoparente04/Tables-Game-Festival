import { Component, OnInit, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Meta, Title } from '@angular/platform-browser'
import { PublicApi } from '../core/api'
import { MapCanvas } from '../shared/venue-map/map-canvas'
import { Icon } from './icon'
import { Reveal } from './reveal'
import { kindMeta } from '../shared/venue-map/venue-elements'
import type { EditorElement } from '../shared/venue-map/venue-elements'
import type {
  Json, PublicEventDetail, PublicScheduleSlot, PublicTicketType, PublicVenueMap,
} from '../core/models'

const pad = (n: number) => String(n).padStart(2, '0')
const dayOf = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const timeOf = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

@Component({
  selector: 'app-public-event-page',
  imports: [FormsModule, RouterLink, MapCanvas, Icon, Reveal],
  template: `
    @if (notFound()) {
      <div class="wrap"><div class="pcard pad center">
        <h2>Event not found</h2>
        <p class="pmuted">It may have ended or been unpublished.</p>
        <a routerLink="/" class="pbtn ghost sm"><app-icon name="arrow-left" [size]="14" /> All events</a>
      </div></div>
    } @else if (event(); as ev) {
      <section class="hero" [style.background-image]="ev.hero_image_url ? 'url(' + ev.hero_image_url + ')' : 'var(--pub-grad)'">
        <div class="hero-inner">
          <a routerLink="/" class="back pmuted"><app-icon name="arrow-left" [size]="14" /> All events</a>
          <div class="hero-meta">
            <span class="pchip">{{ ev.event_type_label }}</span>
            @if (ev.start_date) { <span class="pchip"><app-icon name="calendar" [size]="14" /> {{ dates() }}</span> }
            @if (ev.start_time) { <span class="pchip"><app-icon name="clock" [size]="14" /> {{ ev.start_time.slice(0, 5) }}{{ ev.end_time ? '–' + ev.end_time.slice(0, 5) : '' }}</span> }
            @if (ev.venue) { <span class="pchip"><app-icon name="map-pin" [size]="14" /> {{ ev.venue }}</span> }
          </div>
          <h1 class="title">{{ ev.name }}</h1>
          @if (ev.subtitle) { <p class="subtitle">{{ ev.subtitle }}</p> }
          @if (ev.location_address) { <p class="pmuted addr">{{ ev.location_address }}</p> }
        </div>
      </section>

      <div class="wrap layout">
        <div class="content">
          @if (ev.description) {
            <section class="pcard pad" appReveal>
              <h2>About</h2>
              <p class="desc">{{ ev.description }}</p>
            </section>
          }

          @if (ev.lineup.length) {
            <section class="pcard pad" appReveal>
              <h2>Lineup</h2>
              <div class="lineup">
                @for (a of ev.lineup; track a.id) {
                  <div class="artist" [class.head]="a.is_headliner">
                    @if (a.image_url) { <img [src]="a.image_url" [alt]="a.name" class="a-img" /> }
                    @else { <div class="a-img ph"><app-icon name="music" [size]="22" /></div> }
                    <div class="a-meta">
                      <strong>{{ a.name }}</strong>
                      <span class="pmuted">{{ a.kind }}@if (a.is_headliner) { · <app-icon name="star" [size]="12" /> headliner }</span>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          @if (days().length) {
            <section class="pcard pad" appReveal>
              <h2>Programme</h2>
              <div class="day-tabs">
                @for (d of days(); track d) {
                  <button class="pchip day" [class.grad]="selectedDay() === d" (click)="selectedDay.set(d)">{{ d }}</button>
                }
              </div>
              <div class="slots">
                @for (s of daySlots(); track s.id) {
                  <div class="slot">
                    <span class="s-time">{{ time(s.starts_at) }}–{{ time(s.ends_at) }}</span>
                    <div class="s-what">
                      <strong>{{ s.title }}</strong>
                      <span class="pmuted">
                        @if (s.artist_name) { {{ s.artist_name }} }
                        @if (s.area_name) { · {{ s.area_name }} }
                      </span>
                    </div>
                    <span class="pchip s-kind">{{ s.kind }}</span>
                  </div>
                }
              </div>
            </section>
          }

          @if (map(); as m) {
            <section class="pcard pad" appReveal>
              <h2>Venue map</h2>
              <p class="pmuted map-hint">Scroll to zoom, drag to pan — tap stands and stages for details.</p>
              <div class="map-box">
                <app-map-canvas
                  [width]="m.width" [height]="m.height"
                  [background]="mapBackground()" [elements]="mapElements()"
                  [editable]="false" [selectedId]="pickedId()"
                  (select)="pickedId.set($event)"
                />
              </div>
              @if (picked(); as p) {
                <div class="picked">
                  <span class="glyph">{{ glyph(p.kind) }}</span>
                  <strong>{{ p.label || kindLabel(p.kind) }}</strong>
                  <span class="pmuted">{{ kindLabel(p.kind) }}</span>
                  @if (p.capacity) { <span class="pchip"><app-icon name="user" [size]="13" /> {{ p.capacity }}</span> }
                </div>
              }
            </section>
          }

          @if (gallery().length) {
            <section class="pcard pad" appReveal>
              <h2>Gallery</h2>
              <div class="gal">
                @for (img of gallery(); track img.url) {
                  <img [src]="img.url" [alt]="img.alt || ev.name" loading="lazy" (click)="lightbox.set(img.url)" />
                }
              </div>
            </section>
          }
        </div>

        <!-- Tickets -->
        <aside class="tickets">
          <div class="pcard pad sticky">
            <h2>Tickets</h2>
            @if (!tickets().length) {
              <p class="pmuted">Ticket sales are not open (yet) — this may be a free-entry event.</p>
            } @else {
              @for (t of tickets(); track t.id) {
                <div class="tier" [class.off]="t.available === 0">
                  <div class="t-info">
                    <strong>{{ t.name }}</strong>
                    @if (t.description) { <span class="pmuted t-desc">{{ t.description }}</span> }
                    <span class="t-price">{{ isFree(t) ? 'Free' : '€' + t.price }}</span>
                    @if (t.available !== null) {
                      <span class="pmuted t-left">{{ t.available === 0 ? 'Sold out' : t.available + ' left' }}</span>
                    }
                  </div>
                  <div class="stepper">
                    <button (click)="dec(t)" [disabled]="qty(t.id) === 0">−</button>
                    <span>{{ qty(t.id) }}</span>
                    <button (click)="inc(t)" [disabled]="!canInc(t)">＋</button>
                  </div>
                </div>
              }

              @if (totalTickets() > 0) {
                <div class="total">
                  <span>{{ totalTickets() }} ticket(s)</span>
                  <strong>{{ totalAmount() === 0 ? 'Free' : '€' + totalAmount().toFixed(2) }}</strong>
                </div>
                <input class="pinput" placeholder="Your name" [(ngModel)]="buyerName" />
                <input class="pinput" type="email" placeholder="you@email.com" [(ngModel)]="buyerEmail" />
                <button class="pbtn buy" (click)="order()" [disabled]="ordering() || !buyerName.trim() || !buyerEmail.trim()">
                  {{ ordering() ? 'Processing…' : totalAmount() === 0 ? 'Get free tickets' : 'Buy tickets' }}
                </button>
                @if (orderError()) { <div class="err">{{ orderError() }}</div> }
                <p class="pmuted fine">Tickets arrive by email with QR codes. No account needed.</p>
              }
            }
          </div>
        </aside>
      </div>

      @if (lightbox(); as url) {
        <div class="lb" (click)="lightbox.set(null)"><img [src]="url" alt="" /></div>
      }
    } @else {
      <div class="wrap"><div class="pcard pad center pmuted">Loading…</div></div>
    }
  `,
  styles: `
    .wrap { padding: 0 max(24px, 5vw); }
    .pad { padding: clamp(18px, 3vw, 28px); }
    .center { text-align: center; margin-top: 40px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
    .hero { background-size: cover; background-position: center; position: relative; border-bottom: 1px solid var(--pub-border); }
    .hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,13,20,0.55), rgba(11,13,20,0.92)); }
    .hero-inner { position: relative; padding: 28px max(24px, 5vw) clamp(34px, 5vw, 60px); max-width: 900px; }
    .back { display: inline-block; margin-bottom: 22px; font-size: 13px; font-weight: 600; }
    .hero-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .title { font-size: clamp(30px, 5vw, 54px); font-weight: 800; line-height: 1.06; }
    .subtitle { font-size: clamp(15px, 2vw, 19px); color: var(--pub-muted); margin-top: 10px; }
    .addr { font-size: 13px; margin-top: 6px; }
    .layout { display: grid; grid-template-columns: 1fr 340px; gap: 22px; margin-top: 26px; align-items: start; }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
    .content { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
    .content h2 { font-size: 20px; margin-bottom: 14px; }
    .desc { white-space: pre-line; color: var(--pub-muted); line-height: 1.7; }
    .lineup { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
    .artist { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 14px; background: var(--pub-surface); border: 1px solid var(--pub-border); }
    .artist.head { border-color: var(--pub-accent); background: rgba(129, 140, 248, 0.08); }
    .a-img { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; }
    .a-img.ph { display: grid; place-items: center; background: var(--pub-surface-2); font-size: 20px; }
    .a-meta { display: flex; flex-direction: column; font-size: 14px; }
    .a-meta .pmuted { font-size: 12px; }
    .day-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .day { cursor: pointer; }
    .slots { display: flex; flex-direction: column; }
    .slot { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--pub-border); }
    .slot:last-child { border-bottom: none; }
    .s-time { font-family: monospace; font-weight: 700; color: var(--pub-accent); min-width: 96px; }
    .s-what { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .s-what .pmuted { font-size: 13px; }
    .s-kind { font-size: 11px; }
    .map-hint { font-size: 13px; margin-bottom: 10px; }
    .map-box { height: clamp(300px, 45vw, 460px); border-radius: 14px; overflow: hidden; }
    .picked { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 14px; border-radius: 12px; background: var(--pub-surface-2); }
    .picked .glyph { font-size: 18px; }
    .gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .gal img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 12px; cursor: zoom-in; transition: transform 0.15s; }
    .gal img:hover { transform: scale(1.02); }
    .tickets .sticky { position: sticky; top: 86px; display: flex; flex-direction: column; gap: 12px; }
    .tier { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px; border-radius: 14px; background: var(--pub-surface); border: 1px solid var(--pub-border); }
    .tier.off { opacity: 0.5; }
    .t-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .t-desc { font-size: 12px; }
    .t-price { font-weight: 800; font-size: 15px; }
    .t-left { font-size: 12px; }
    .stepper { display: flex; align-items: center; gap: 10px; }
    .stepper button { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--pub-border); background: var(--pub-surface-2); color: var(--pub-text); font-size: 15px; cursor: pointer; }
    .stepper button:disabled { opacity: 0.35; cursor: default; }
    .stepper span { min-width: 18px; text-align: center; font-weight: 700; }
    .total { display: flex; justify-content: space-between; padding: 10px 4px 0; font-size: 15px; }
    .buy { width: 100%; }
    .err { color: #fda4af; background: rgba(225, 29, 72, 0.15); padding: 10px 12px; border-radius: 10px; font-size: 13px; }
    .fine { font-size: 12px; text-align: center; }
    .lb { position: fixed; inset: 0; background: rgba(5, 6, 10, 0.92); display: grid; place-items: center; z-index: 50; cursor: zoom-out; padding: 4vw; }
    .lb img { max-width: 100%; max-height: 100%; border-radius: 12px; }
  `,
})
export class PublicEventPage implements OnInit {
  private api = inject(PublicApi)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private title = inject(Title)
  private meta = inject(Meta)

  readonly event = signal<PublicEventDetail | null>(null)
  readonly tickets = signal<PublicTicketType[]>([])
  readonly schedule = signal<PublicScheduleSlot[]>([])
  readonly map = signal<PublicVenueMap | null>(null)
  readonly notFound = signal(false)
  readonly selectedDay = signal('')
  readonly pickedId = signal<number | null>(null)
  readonly lightbox = signal<string | null>(null)
  readonly ordering = signal(false)
  readonly orderError = signal('')
  readonly quantities = signal<Record<number, number>>({})

  buyerName = ''
  buyerEmail = ''

  readonly days = computed(() => [...new Set(this.schedule().map((s) => dayOf(s.starts_at)))].sort())
  readonly daySlots = computed(() =>
    this.schedule()
      .filter((s) => dayOf(s.starts_at) === this.selectedDay())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  )
  readonly gallery = computed(() => (this.event()?.images ?? []).filter((i) => i.kind === 'gallery'))

  mapBackground() {
    return (this.map()?.background ?? []) as never[]
  }

  readonly mapElements = computed<EditorElement[]>(() =>
    (this.map()?.elements ?? []).map((e) => ({
      ...e, area_id: null, resource_id: null, booking_id: null,
    })),
  )
  readonly picked = computed(() => {
    const id = this.pickedId()
    return id === null ? null : this.map()?.elements.find((e) => e.id === id) ?? null
  })

  readonly totalTickets = computed(() =>
    Object.values(this.quantities()).reduce((a, b) => a + b, 0),
  )
  readonly totalAmount = computed(() =>
    this.tickets().reduce((sum, t) => sum + Number(t.price) * this.qty(t.id), 0),
  )

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? ''
    this.api.event(slug).subscribe({
      next: (ev) => {
        this.event.set(ev)
        this.title.setTitle(`${ev.name} — Festival`)
        this.meta.updateTag({ property: 'og:title', content: ev.name })
        if (ev.subtitle || ev.description) {
          this.meta.updateTag({ property: 'og:description', content: ev.subtitle ?? ev.description!.slice(0, 160) })
        }
        if (ev.hero_image_url) this.meta.updateTag({ property: 'og:image', content: ev.hero_image_url })
      },
      error: () => this.notFound.set(true),
    })
    this.api.ticketTypes(slug).subscribe({ next: (t) => this.tickets.set(t), error: () => undefined })
    this.api.schedule(slug).subscribe({
      next: (s) => {
        this.schedule.set(s)
        const days = this.days()
        if (days.length) this.selectedDay.set(days[0]!)
      },
      error: () => undefined,
    })
    this.api.map(slug).subscribe({ next: (m) => this.map.set(m), error: () => undefined })
  }

  dates(): string {
    const e = this.event()
    if (!e?.start_date) return ''
    return e.end_date && e.end_date !== e.start_date ? `${e.start_date} → ${e.end_date}` : e.start_date
  }

  time = timeOf
  glyph = (kind: string) => kindMeta(kind).glyph
  kindLabel = (kind: string) => kindMeta(kind).label

  isFree(t: PublicTicketType): boolean {
    return Number(t.price) === 0
  }

  qty(typeId: number): number {
    return this.quantities()[typeId] ?? 0
  }

  canInc(t: PublicTicketType): boolean {
    const next = this.qty(t.id) + 1
    if (next > t.max_per_order) return false
    if (t.available !== null && next > t.available) return false
    return true
  }

  inc(t: PublicTicketType) {
    if (this.canInc(t)) this.quantities.update((q) => ({ ...q, [t.id]: this.qty(t.id) + 1 }))
  }

  dec(t: PublicTicketType) {
    this.quantities.update((q) => ({ ...q, [t.id]: Math.max(0, this.qty(t.id) - 1) }))
  }

  order() {
    const ev = this.event()
    if (!ev || this.totalTickets() === 0) return
    const items = this.tickets()
      .filter((t) => this.qty(t.id) > 0)
      .map((t) => ({ ticket_type_id: t.id, quantity: this.qty(t.id) }))
    const body: Json = {
      event_id: ev.id,
      customer_name: this.buyerName.trim(),
      customer_email: this.buyerEmail.trim(),
      items,
    }
    this.ordering.set(true)
    this.orderError.set('')
    this.api.createOrder(body).subscribe({
      next: (result) => {
        if (result.checkout_url) {
          window.location.href = result.checkout_url
        } else {
          void this.router.navigate(['/orders', result.order.code])
        }
      },
      error: (e) => {
        this.orderError.set(e?.error?.error ?? 'Could not complete the order — please try again')
        this.ordering.set(false)
      },
    })
  }
}
