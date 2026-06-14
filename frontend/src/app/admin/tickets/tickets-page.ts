import { Component, OnInit, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { OrdersApi, TicketTypesApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import type { Json, Order, TicketType } from '../../core/models'

const ORDER_STATUSES = ['pending', 'confirmed', 'cancelled', 'expired', 'refunded']

@Component({
  selector: 'app-tickets-page',
  imports: [FormsModule, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Tickets &amp; orders</h1><p class="muted">Ticket tiers, visitor orders and door check-in.</p></div>
    </div>
    <div class="toolbar">
      <app-event-selector />
    </div>

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else {
      <!-- Check-in box -->
      @if (canCheckIn()) {
        <div class="card pad checkin">
          <h3>Door check-in</h3>
          <div class="ci-row">
            <input class="input ci-input" placeholder="Scan or type a ticket code…" [(ngModel)]="checkInCode" (keyup.enter)="checkIn()" />
            <button class="btn btn-primary" (click)="checkIn()" [disabled]="!checkInCode.trim()">Check in</button>
          </div>
          @if (checkInMsg()) {
            <div class="ci-msg" [class.ok]="checkInOk()" [class.ko]="!checkInOk()">{{ checkInMsg() }}</div>
          }
        </div>
      }

      <!-- Ticket tiers -->
      <div class="card pad">
        <div class="head">
          <h3>Ticket tiers</h3>
          @if (canManageTypes()) {
            <button class="btn btn-sm btn-primary" (click)="startCreateType()">{{ showTypeForm() ? 'Cancel' : '+ New tier' }}</button>
          }
        </div>
        @if (showTypeForm()) {
          <div class="form-grid type-form">
            <div class="field"><label>Name *</label><input class="input" [(ngModel)]="typeForm.name" placeholder="e.g. Early bird" /></div>
            <div class="field"><label>Price (€, 0 = free)</label><input class="input" type="number" min="0" step="0.01" [(ngModel)]="typeForm.price" /></div>
            <div class="field"><label>Capacity (blank = unlimited)</label><input class="input" type="number" min="0" [(ngModel)]="typeForm.capacity" /></div>
            <div class="field"><label>Max per order</label><input class="input" type="number" min="1" max="100" [(ngModel)]="typeForm.max_per_order" /></div>
            <div class="field"><label>Status</label>
              <select class="select" [(ngModel)]="typeForm.status">
                <option value="on_sale">on sale</option><option value="hidden">hidden</option><option value="paused">paused</option>
              </select>
            </div>
            <div class="field"><label>Description</label><input class="input" [(ngModel)]="typeForm.description" placeholder="Shown on the public page" /></div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" (click)="saveType()" [disabled]="savingType() || !typeForm.name.trim()">{{ savingType() ? 'Saving…' : 'Save tier' }}</button>
            @if (typeError()) { <span class="err">{{ typeError() }}</span> }
          </div>
        }
        <table class="table">
          <thead><tr><th>Name</th><th>Price</th><th>Sold / capacity</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (t of types(); track t.id) {
              <tr>
                <td><strong>{{ t.name }}</strong>@if (t.description) { <div class="muted sm">{{ t.description }}</div> }</td>
                <td>{{ isFree(t) ? 'Free' : '€' + t.price }}</td>
                <td>{{ t.sold ?? 0 }} / {{ t.capacity ?? '∞' }}</td>
                <td><span class="badge" [class]="typeStatusClass(t.status)">{{ t.status }}</span></td>
                <td><div class="actions-inline">
                  @if (canManageTypes()) {
                    <button class="btn btn-sm" (click)="startEditType(t)">Edit</button>
                    <button class="btn btn-sm btn-danger" (click)="removeType(t)">Delete</button>
                  }
                </div></td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">No ticket tiers yet — add one to open sales.</td></tr> }
          </tbody>
        </table>
      </div>

      <!-- Orders -->
      <div class="card pad">
        <div class="head">
          <h3>Orders <span class="muted">({{ orders().length }})</span></h3>
          <select class="select status-sel" [ngModel]="statusFilter()" (ngModelChange)="onStatusFilter($event)">
            <option value="">All statuses</option>
            @for (s of orderStatuses; track s) { <option [value]="s">{{ s }}</option> }
          </select>
        </div>
        <table class="table">
          <thead><tr><th>Code</th><th>Customer</th><th>Tickets</th><th>Total</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            @for (o of orders(); track o.id) {
              <tr>
                <td><span class="mono">{{ o.code }}</span></td>
                <td><strong>{{ o.customer_name }}</strong><div class="muted sm">{{ o.customer_email }}</div></td>
                <td>{{ o.tickets_count }}</td>
                <td>{{ Number(o.total_amount) > 0 ? '€' + o.total_amount : 'Free' }}</td>
                <td><span class="badge" [class]="orderStatusClass(o.status)">{{ o.status }}</span></td>
                <td class="muted sm">{{ o.created_at.slice(0, 10) }}</td>
                <td>
                  @if (canCancel() && (o.status === 'confirmed' || o.status === 'pending')) {
                    <button class="btn btn-sm btn-danger" (click)="cancelOrder(o)">Cancel</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">No orders yet.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .pad { padding: 20px 22px; margin-bottom: 16px; }
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .checkin { border-left: 4px solid var(--primary); }
    .ci-row { display: flex; gap: 10px; margin-top: 8px; }
    .ci-input { max-width: 320px; font-family: monospace; letter-spacing: 1px; }
    .ci-msg { margin-top: 10px; padding: 10px 14px; border-radius: var(--radius-sm); font-weight: 600; font-size: 14px; }
    .ci-msg.ok { background: var(--success-50); color: var(--success); }
    .ci-msg.ko { background: var(--danger-50); color: var(--danger); }
    .type-form { margin-bottom: 12px; }
    .actions { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .actions-inline { display: flex; gap: 6px; }
    .err { color: var(--danger); font-size: 13px; }
    .sm { font-size: 12px; }
    .mono { font-family: monospace; letter-spacing: 1px; font-weight: 700; }
    .status-sel { width: auto; }
  `,
})
export class TicketsPage implements OnInit {
  readonly ctx = inject(EventContext)
  private typesApi = inject(TicketTypesApi)
  private ordersApi = inject(OrdersApi)
  private perms = inject(PermissionsService)

  readonly Number = Number
  readonly orderStatuses = ORDER_STATUSES
  readonly types = signal<TicketType[]>([])
  readonly orders = signal<Order[]>([])
  readonly statusFilter = signal('')
  readonly showTypeForm = signal(false)
  readonly savingType = signal(false)
  readonly typeError = signal('')
  readonly editingTypeId = signal<number | null>(null)
  readonly checkInMsg = signal('')
  readonly checkInOk = signal(false)

  checkInCode = ''
  typeForm = {
    name: '', description: '', price: 0 as number | null,
    capacity: null as number | null, max_per_order: 10, status: 'on_sale',
  }

  readonly canManageTypes = this.perms.can('ticketTypes', 'create')
  readonly canCancel = this.perms.can('orders', 'cancel')
  readonly canCheckIn = this.perms.can('orders', 'checkIn')

  isFree(t: TicketType): boolean {
    return Number(t.price) === 0
  }

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private load(eventId: number) {
    this.typesApi.list(eventId).subscribe((t) => this.types.set(t))
    this.loadOrders(eventId)
  }

  private loadOrders(eventId: number) {
    const params: { event_id: number; status?: string } = { event_id: eventId }
    if (this.statusFilter()) params.status = this.statusFilter()
    this.ordersApi.list(params).subscribe((o) => this.orders.set(o))
  }

  onStatusFilter(value: string) {
    this.statusFilter.set(value)
    const id = this.ctx.selectedId()
    if (id) this.loadOrders(id)
  }

  typeStatusClass(status: string) {
    return status === 'on_sale' ? 'badge-success' : status === 'paused' ? 'badge-warning' : ''
  }

  orderStatusClass(status: string) {
    return status === 'confirmed' ? 'badge-success'
      : status === 'pending' ? 'badge-warning'
      : status === 'refunded' ? 'badge-primary' : 'badge-danger'
  }

  startCreateType() {
    if (this.showTypeForm()) { this.showTypeForm.set(false); return }
    this.editingTypeId.set(null)
    this.typeForm = { name: '', description: '', price: 0, capacity: null, max_per_order: 10, status: 'on_sale' }
    this.typeError.set('')
    this.showTypeForm.set(true)
  }

  startEditType(t: TicketType) {
    this.editingTypeId.set(t.id)
    this.typeForm = {
      name: t.name, description: t.description ?? '', price: Number(t.price),
      capacity: t.capacity, max_per_order: t.max_per_order, status: t.status,
    }
    this.typeError.set('')
    this.showTypeForm.set(true)
  }

  saveType() {
    const eventId = this.ctx.selectedId()
    if (!eventId || !this.typeForm.name.trim()) return
    const body: Json = {
      name: this.typeForm.name.trim(),
      price: Number(this.typeForm.price ?? 0),
      max_per_order: Number(this.typeForm.max_per_order) || 10,
      status: this.typeForm.status,
    }
    if (this.typeForm.description.trim()) body['description'] = this.typeForm.description.trim()
    const editing = this.editingTypeId()
    if (editing) {
      body['capacity'] = this.typeForm.capacity === null || (this.typeForm.capacity as unknown) === '' ? null : Number(this.typeForm.capacity)
    } else if (this.typeForm.capacity !== null && (this.typeForm.capacity as unknown) !== '') {
      body['capacity'] = Number(this.typeForm.capacity)
    }

    this.savingType.set(true)
    this.typeError.set('')
    const req = editing
      ? this.typesApi.update(editing, body)
      : this.typesApi.create({ ...body, event_id: eventId })
    req.subscribe({
      next: () => {
        this.savingType.set(false)
        this.showTypeForm.set(false)
        this.editingTypeId.set(null)
        this.load(eventId)
      },
      error: (e) => {
        this.typeError.set(e?.error?.error ?? 'Could not save tier')
        this.savingType.set(false)
      },
    })
  }

  removeType(t: TicketType) {
    if (!confirm(`Delete tier "${t.name}"?`)) return
    this.typesApi.remove(t.id).subscribe({
      next: () => { const id = this.ctx.selectedId(); if (id) this.load(id) },
      error: (e) => alert(e?.error?.error ?? 'Could not delete tier'),
    })
  }

  cancelOrder(o: Order) {
    if (!confirm(`Cancel order ${o.code}? Its tickets become invalid and capacity is freed.`)) return
    this.ordersApi.cancel(o.id).subscribe(() => {
      const id = this.ctx.selectedId()
      if (id) this.load(id)
    })
  }

  checkIn() {
    const code = this.checkInCode.trim().toUpperCase()
    if (!code) return
    this.ordersApi.checkIn(code).subscribe({
      next: (r) => {
        this.checkInOk.set(true)
        this.checkInMsg.set(`${r.ticket_type_name} — ${r.ticket.attendee_name || r.customer_name} (order ${r.order_code})`)
        this.checkInCode = ''
        const id = this.ctx.selectedId()
        if (id) this.loadOrders(id)
      },
      error: (e) => {
        this.checkInOk.set(false)
        this.checkInMsg.set(e?.error?.error ?? 'Check-in failed')
      },
    })
  }
}
