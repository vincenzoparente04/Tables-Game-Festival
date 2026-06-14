import { Component, OnInit, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import {
  AreasApi, BookingsApi, EventsApi, GamesApi, InvoicesApi, ParticipantsApi, ResourceTypesApi,
} from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import { Icon } from '../../shared/icon'
import type { Area, Booking, Game, Invoice, PipelineStage, Quote, ResourceType } from '../../core/models'

@Component({
  selector: 'app-booking-detail',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <a routerLink="/admin/bookings" class="link back"><app-icon name="arrow-left" [size]="14" /> Bookings</a>
    @if (loading()) { <div class="card empty">Loading…</div> }
    @else if (!booking()) { <div class="card empty">Booking not found.</div> }
    @else {
      <div class="page-head">
        <div><h1>{{ participantName() }}</h1><p class="muted">Booking #{{ booking()!.id }}</p></div>
        <div class="field" style="min-width:200px;margin:0">
          <label>Stage</label>
          <select class="select" [ngModel]="booking()!.stage_id" (ngModelChange)="changeStage($event)" [disabled]="!canEdit()">
            <option [ngValue]="null">—</option>
            @for (s of stages(); track s.id) { <option [ngValue]="s.id">{{ s.label }}</option> }
          </select>
        </div>
      </div>

      <div class="cols">
        <div class="leftcol">
          <!-- Booked resources -->
          <div class="card pad">
            <h3>Booked resources</h3>
            @if (canEdit()) {
              <div class="addrow">
                <select class="select" [(ngModel)]="resForm.resource_type_id" name="rrt"><option [ngValue]="null" disabled>Type…</option>@for (t of resourceTypes(); track t.id) { <option [ngValue]="t.id">{{ t.label }}</option> }</select>
                <select class="select" [(ngModel)]="resForm.area_id" name="rar"><option [ngValue]="null">No area</option>@for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }</select>
                <input class="input" type="number" placeholder="Qty" [(ngModel)]="resForm.quantity" name="rq" />
                <input class="input" type="number" placeholder="Unit €" [(ngModel)]="resForm.unit_price" name="rp" />
                <button class="btn btn-primary btn-sm" (click)="addResource()" [disabled]="!resForm.resource_type_id || !resForm.quantity">Add</button>
              </div>
            }
            <table class="table">
              <thead><tr><th>Type</th><th>Area</th><th>Qty</th><th>Unit €</th><th></th></tr></thead>
              <tbody>
                @for (r of booking()!.resources ?? []; track r.id) {
                  <tr><td>{{ rtLabel()[r.resource_type_id] || '—' }}</td><td class="muted">{{ r.area_id ? areaName()[r.area_id] : '—' }}</td><td>{{ r.quantity }}</td><td>{{ r.unit_price }}</td>
                    <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="removeResource(r.id)"><app-icon name="x" [size]="13" /></button> }</div></td></tr>
                } @empty { <tr><td colspan="5" class="muted">No resources booked.</td></tr> }
              </tbody>
            </table>
          </div>

          <!-- Items (catalog, e.g. games) -->
          <div class="card pad">
            <h3>Items</h3>
            @if (canEdit() && games().length) {
              <div class="addrow">
                <select class="select" [(ngModel)]="itemForm.item_ref" name="irf"><option [ngValue]="null" disabled>Game…</option>@for (g of games(); track g.id) { <option [ngValue]="g.id">{{ g.name }}</option> }</select>
                <input class="input" type="number" placeholder="Qty" [(ngModel)]="itemForm.quantity" name="iq" />
                <button class="btn btn-primary btn-sm" (click)="addItem()" [disabled]="!itemForm.item_ref">Add</button>
              </div>
            }
            <table class="table">
              <thead><tr><th>Item</th><th>Qty</th><th></th></tr></thead>
              <tbody>
                @for (it of booking()!.items ?? []; track it.id) {
                  <tr><td>{{ it.item_ref ? (gameName()[it.item_ref] || it.item_type) : it.item_type }}</td><td>{{ it.quantity }}</td>
                    <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="removeItem(it.id)"><app-icon name="x" [size]="13" /></button> }</div></td></tr>
                } @empty { <tr><td colspan="3" class="muted">No items.</td></tr> }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pricing / invoice -->
        <div class="rightcol">
          <div class="card pad">
            <h3>Pricing</h3>
            @if (quote(); as q) {
              <div class="qline"><span class="muted">Subtotal</span><span>€{{ q.subtotal }}</span></div>
              <div class="qline"><span class="muted">Discount</span><span>−€{{ q.discount }}</span></div>
              <div class="qline total"><span>Total</span><span>€{{ q.total }}</span></div>
            }
            <hr class="sep" />
            @if (invoice(); as inv) {
              <div class="qline"><span class="muted">Invoice</span><span>{{ inv.invoice_number }}</span></div>
              <div class="qline"><span class="muted">Status</span><span class="badge" [class]="inv.status === 'paid' ? 'badge-success' : 'badge-primary'">{{ inv.status }}</span></div>
              <div class="qline"><span class="muted">Amount</span><span>€{{ inv.total_amount }}</span></div>
              <div class="invbtns">
                @if (canInvoice()) { <button class="btn btn-sm" (click)="generate()">Refresh</button> }
                @if (canMarkPaid() && inv.status !== 'paid') { <button class="btn btn-sm btn-primary" (click)="markPaid(inv.id)">Mark paid</button> }
              </div>
            } @else if (canInvoice()) {
              <button class="btn btn-primary" (click)="generate()">Generate invoice</button>
            } @else {
              <span class="muted">No invoice yet.</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 16px; }
    .cols { display: grid; grid-template-columns: 1fr 320px; gap: 18px; align-items: start; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    .leftcol { display: flex; flex-direction: column; gap: 18px; }
    .addrow { display: flex; gap: 8px; margin: 12px 0 16px; flex-wrap: wrap; }
    .addrow .input, .addrow .select { width: auto; flex: 1; min-width: 80px; }
    .qline { display: flex; justify-content: space-between; padding: 6px 0; }
    .qline.total { font-weight: 700; font-size: 16px; }
    .sep { border: 0; border-top: 1px solid var(--border); margin: 12px 0; }
    .invbtns { display: flex; gap: 8px; margin-top: 12px; }
  `,
})
export class BookingDetail implements OnInit {
  private api = inject(BookingsApi)
  private participantsApi = inject(ParticipantsApi)
  private eventsApi = inject(EventsApi)
  private rtApi = inject(ResourceTypesApi)
  private areasApi = inject(AreasApi)
  private gamesApi = inject(GamesApi)
  private invoicesApi = inject(InvoicesApi)
  private route = inject(ActivatedRoute)
  private perms = inject(PermissionsService)

  readonly booking = signal<Booking | null>(null)
  readonly participantName = signal<string>('')
  readonly stages = signal<PipelineStage[]>([])
  readonly resourceTypes = signal<ResourceType[]>([])
  readonly areas = signal<Area[]>([])
  readonly games = signal<Game[]>([])
  readonly quote = signal<Quote | null>(null)
  readonly invoice = signal<Invoice | null>(null)
  readonly loading = signal(true)

  readonly rtLabel = computed(() => Object.fromEntries(this.resourceTypes().map((t) => [t.id, t.label])))
  readonly areaName = computed(() => Object.fromEntries(this.areas().map((a) => [a.id, a.name])))
  readonly gameName = computed(() => Object.fromEntries(this.games().map((g) => [g.id, g.name])))

  readonly canEdit = this.perms.can('bookings', 'update')
  readonly canInvoice = this.perms.can('invoices', 'create')
  readonly canMarkPaid = this.perms.can('invoices', 'markPaid')

  resForm = { resource_type_id: null as number | null, area_id: null as number | null, quantity: null as number | null, unit_price: null as number | null }
  itemForm = { item_ref: null as number | null, quantity: 1 }

  private id = 0

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'))
    this.gamesApi.list().subscribe((g) => this.games.set(g))
    this.loadBooking(true)
  }

  private loadBooking(initial = false) {
    this.api.get(this.id).subscribe({
      next: (b) => {
        this.booking.set(b)
        if (initial) {
          this.participantsApi.get(b.participant_id).subscribe((p) => this.participantName.set(p.name))
          this.eventsApi.pipeline(b.event_id).subscribe((s) => this.stages.set(s))
          this.rtApi.list(b.event_id).subscribe((t) => this.resourceTypes.set(t))
          this.areasApi.list(b.event_id).subscribe((a) => this.areas.set(a))
        }
        this.refreshMoney()
        this.loading.set(false)
      },
      error: () => this.loading.set(false),
    })
  }

  private refreshMoney() {
    this.invoicesApi.preview(this.id).subscribe((q) => this.quote.set(q))
    this.invoicesApi.list({ booking_id: this.id }).subscribe((inv) => this.invoice.set(inv[0] ?? null))
  }

  changeStage(stageId: number | null) {
    this.api.update(this.id, { stage_id: stageId }).subscribe((b) => this.booking.set(b))
  }

  addResource() {
    if (!this.resForm.resource_type_id || !this.resForm.quantity) return
    const body: Record<string, unknown> = { resource_type_id: this.resForm.resource_type_id, quantity: this.resForm.quantity }
    if (this.resForm.area_id) body['area_id'] = this.resForm.area_id
    if (this.resForm.unit_price != null) body['unit_price'] = this.resForm.unit_price
    this.api.addResource(this.id, body).subscribe(() => {
      this.resForm = { resource_type_id: null, area_id: null, quantity: null, unit_price: null }
      this.loadBooking()
    })
  }

  removeResource(rid: number) { this.api.removeResource(this.id, rid).subscribe(() => this.loadBooking()) }

  addItem() {
    if (!this.itemForm.item_ref) return
    this.api.addItem(this.id, { item_type: 'game', item_ref: this.itemForm.item_ref, quantity: this.itemForm.quantity || 1 })
      .subscribe(() => { this.itemForm = { item_ref: null, quantity: 1 }; this.loadBooking() })
  }

  removeItem(iid: number) { this.api.removeItem(this.id, iid).subscribe(() => this.loadBooking()) }

  generate() { this.invoicesApi.generate(this.id).subscribe(() => this.refreshMoney()) }
  markPaid(invoiceId: number) { this.invoicesApi.markPaid(invoiceId).subscribe(() => this.refreshMoney()) }
}
