import { Component, OnInit, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { AreasApi, PricingTiersApi, ResourceTypesApi, ResourcesApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import { Icon } from '../../shared/icon'
import type { Area, PricingTier, ResourceModel, ResourceType } from '../../core/models'

@Component({
  selector: 'app-resources-page',
  imports: [FormsModule, EventSelector, Icon],
  template: `
    <div class="page-head">
      <div><h1>Resources &amp; areas</h1><p class="muted">Spaces, resource types, inventory and pricing for the event.</p></div>
    </div>
    <div class="toolbar"><app-event-selector /></div>

    @if (error()) {
      <div class="card pad err-banner">{{ error() }} <button class="btn btn-sm" (click)="error.set('')">Dismiss</button></div>
    }

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else {
      <div class="sections">
        <!-- Areas -->
        <div class="card pad">
          <h3>Areas</h3>
          @if (canEdit()) {
            <div class="addrow">
              <input class="input" placeholder="Name" name="an" [(ngModel)]="areaForm.name" />
              <select class="select" name="ak" [(ngModel)]="areaForm.kind"><option>indoor</option><option>outdoor</option><option>stage</option></select>
              <input class="input" type="number" placeholder="Capacity" name="ac" [(ngModel)]="areaForm.capacity" />
              <button class="btn btn-primary btn-sm" (click)="addArea()" [disabled]="!areaForm.name.trim()">Add</button>
            </div>
          }
          <table class="table">
            <thead><tr><th>Name</th><th>Kind</th><th>Capacity</th><th></th></tr></thead>
            <tbody>
              @for (a of areas(); track a.id) {
                <tr><td>{{ a.name }}</td><td><span class="badge">{{ a.kind }}</span></td><td class="muted">{{ a.capacity ?? '—' }}</td>
                  <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('area', a.id)"><app-icon name="x" [size]="13" /></button> }</div></td></tr>
              } @empty { <tr><td colspan="4" class="muted">No areas.</td></tr> }
            </tbody>
          </table>
        </div>

        <!-- Resource types -->
        <div class="card pad">
          <h3>Resource types</h3>
          @if (canEdit()) {
            <div class="addrow">
              <input class="input" placeholder="Key (e.g. stand)" name="rk" [(ngModel)]="rtForm.key" />
              <input class="input" placeholder="Label" name="rl" [(ngModel)]="rtForm.label" />
              <input class="input" placeholder="Unit (table/seat/sqm)" name="ru" [(ngModel)]="rtForm.unit" />
              <button class="btn btn-primary btn-sm" (click)="addRt()" [disabled]="!rtForm.key.trim() || !rtForm.label.trim()">Add</button>
            </div>
          }
          <table class="table">
            <thead><tr><th>Label</th><th>Key</th><th>Unit</th><th></th></tr></thead>
            <tbody>
              @for (t of resourceTypes(); track t.id) {
                <tr><td>{{ t.label }}</td><td class="muted">{{ t.key }}</td><td><span class="badge">{{ t.unit }}</span></td>
                  <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('rt', t.id)"><app-icon name="x" [size]="13" /></button> }</div></td></tr>
              } @empty { <tr><td colspan="4" class="muted">No resource types.</td></tr> }
            </tbody>
          </table>
        </div>

        <!-- Inventory -->
        <div class="card pad">
          <h3>Inventory</h3>
          @if (canEdit()) {
            <div class="addrow">
              <select class="select" name="irt" [(ngModel)]="resForm.resource_type_id"><option [ngValue]="null" disabled>Resource type…</option>@for (t of resourceTypes(); track t.id) { <option [ngValue]="t.id">{{ t.label }}</option> }</select>
              <select class="select" name="iar" [(ngModel)]="resForm.area_id"><option [ngValue]="null">No area</option>@for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }</select>
              <input class="input" type="number" placeholder="Quantity" name="iq" [(ngModel)]="resForm.total_quantity" />
              <button class="btn btn-primary btn-sm" (click)="addResource()" [disabled]="!resForm.resource_type_id">Add</button>
            </div>
          }
          <table class="table">
            <thead><tr><th>Resource type</th><th>Area</th><th>Qty</th><th></th></tr></thead>
            <tbody>
              @for (r of resources(); track r.id) {
                <tr><td>{{ rtLabel()[r.resource_type_id] || '—' }}</td><td class="muted">{{ r.area_id ? areaName()[r.area_id] : '—' }}</td><td>{{ r.total_quantity }}</td>
                  <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('res', r.id)"><app-icon name="x" [size]="13" /></button> }</div></td></tr>
              } @empty { <tr><td colspan="4" class="muted">No inventory.</td></tr> }
            </tbody>
          </table>
        </div>

        <!-- Pricing -->
        <div class="card pad">
          <h3>Pricing tiers</h3>
          @if (canEdit()) {
            <div class="addrow">
              <input class="input" placeholder="Name" name="pn" [(ngModel)]="priceForm.name" />
              <select class="select" name="prt" [(ngModel)]="priceForm.resource_type_id"><option [ngValue]="null">Any type</option>@for (t of resourceTypes(); track t.id) { <option [ngValue]="t.id">{{ t.label }}</option> }</select>
              <input class="input" type="number" placeholder="Unit price" name="pu" [(ngModel)]="priceForm.unit_price" />
              <input class="input" type="number" placeholder="€/m²" name="pm" [(ngModel)]="priceForm.price_per_sqm" />
              <button class="btn btn-primary btn-sm" (click)="addPrice()" [disabled]="!priceForm.name.trim()">Add</button>
            </div>
          }
          <table class="table">
            <thead><tr><th>Name</th><th>Resource type</th><th>Unit €</th><th>€/m²</th><th></th></tr></thead>
            <tbody>
              @for (p of pricing(); track p.id) {
                <tr><td>{{ p.name }}</td><td class="muted">{{ p.resource_type_id ? rtLabel()[p.resource_type_id] : 'Any' }}</td><td>{{ p.unit_price }}</td><td>{{ p.price_per_sqm ?? '—' }}</td>
                  <td><div class="actions">@if (canEdit()) { <button class="btn btn-sm btn-danger" (click)="del('price', p.id)"><app-icon name="x" [size]="13" /></button> }</div></td></tr>
              } @empty { <tr><td colspan="5" class="muted">No pricing tiers.</td></tr> }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: `
    .sections { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    @media (max-width: 900px) { .sections { grid-template-columns: 1fr; } }
    .addrow { display: flex; gap: 8px; margin: 12px 0 16px; flex-wrap: wrap; }
    .addrow .input, .addrow .select { width: auto; flex: 1; min-width: 90px; }
    .err-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; color: var(--danger); background: var(--danger-50); border-color: var(--danger); }
  `,
})
export class ResourcesPage implements OnInit {
  readonly ctx = inject(EventContext)
  private areasApi = inject(AreasApi)
  private rtApi = inject(ResourceTypesApi)
  private resApi = inject(ResourcesApi)
  private priceApi = inject(PricingTiersApi)
  private perms = inject(PermissionsService)

  readonly areas = signal<Area[]>([])
  readonly resourceTypes = signal<ResourceType[]>([])
  readonly resources = signal<ResourceModel[]>([])
  readonly pricing = signal<PricingTier[]>([])
  readonly error = signal('')
  readonly canEdit = this.perms.can('resources', 'create')

  readonly rtLabel = computed(() => Object.fromEntries(this.resourceTypes().map((t) => [t.id, t.label])))
  readonly areaName = computed(() => Object.fromEntries(this.areas().map((a) => [a.id, a.name])))

  areaForm = { name: '', kind: 'indoor', capacity: null as number | null }
  rtForm = { key: '', label: '', unit: 'unit' }
  resForm = { resource_type_id: null as number | null, area_id: null as number | null, total_quantity: null as number | null }
  priceForm = { name: '', resource_type_id: null as number | null, unit_price: null as number | null, price_per_sqm: null as number | null }

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.loadAll(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private loadAll(eventId: number) {
    this.areasApi.list(eventId).subscribe((a) => this.areas.set(a))
    this.rtApi.list(eventId).subscribe((t) => this.resourceTypes.set(t))
    this.resApi.list(eventId).subscribe((r) => this.resources.set(r))
    this.priceApi.list(eventId).subscribe((p) => this.pricing.set(p))
  }

  private eid() { return this.ctx.selectedId()! }

  addArea() {
    this.error.set('')
    const body: Record<string, unknown> = { event_id: this.eid(), name: this.areaForm.name.trim(), kind: this.areaForm.kind }
    if (this.areaForm.capacity != null) body['capacity'] = this.areaForm.capacity
    this.areasApi.create(body).subscribe({
      next: () => { this.areaForm = { name: '', kind: 'indoor', capacity: null }; this.areasApi.list(this.eid()).subscribe((a) => this.areas.set(a)) },
      error: (e) => this.fail(e),
    })
  }
  addRt() {
    this.error.set('')
    this.rtApi.create({ event_id: this.eid(), key: this.rtForm.key.trim(), label: this.rtForm.label.trim(), unit: this.rtForm.unit.trim() || 'unit' })
      .subscribe({
        next: () => { this.rtForm = { key: '', label: '', unit: 'unit' }; this.rtApi.list(this.eid()).subscribe((t) => this.resourceTypes.set(t)) },
        error: (e) => this.fail(e),
      })
  }
  addResource() {
    if (!this.resForm.resource_type_id) return
    this.error.set('')
    const body: Record<string, unknown> = { event_id: this.eid(), resource_type_id: this.resForm.resource_type_id, total_quantity: this.resForm.total_quantity ?? 0 }
    if (this.resForm.area_id) body['area_id'] = this.resForm.area_id
    this.resApi.create(body).subscribe({
      next: () => { this.resForm = { resource_type_id: null, area_id: null, total_quantity: null }; this.resApi.list(this.eid()).subscribe((r) => this.resources.set(r)) },
      error: (e) => this.fail(e),
    })
  }
  addPrice() {
    this.error.set('')
    const body: Record<string, unknown> = { event_id: this.eid(), name: this.priceForm.name.trim() }
    if (this.priceForm.resource_type_id) body['resource_type_id'] = this.priceForm.resource_type_id
    if (this.priceForm.unit_price != null) body['unit_price'] = this.priceForm.unit_price
    if (this.priceForm.price_per_sqm != null) body['price_per_sqm'] = this.priceForm.price_per_sqm
    this.priceApi.create(body).subscribe({
      next: () => { this.priceForm = { name: '', resource_type_id: null, unit_price: null, price_per_sqm: null }; this.priceApi.list(this.eid()).subscribe((p) => this.pricing.set(p)) },
      error: (e) => this.fail(e),
    })
  }

  private fail(e: unknown) {
    const msg = (e as { error?: { error?: string } })?.error?.error
    this.error.set(msg ?? 'Action failed — check that you are an admin and an event is selected.')
  }

  del(kind: 'area' | 'rt' | 'res' | 'price', id: number) {
    const e = this.eid()
    if (!confirm('Delete this item?')) return
    this.error.set('')
    const onErr = (err: unknown) => this.fail(err)
    if (kind === 'area') this.areasApi.remove(id).subscribe({ next: () => this.areasApi.list(e).subscribe((a) => this.areas.set(a)), error: onErr })
    if (kind === 'rt') this.rtApi.remove(id).subscribe({ next: () => this.rtApi.list(e).subscribe((t) => this.resourceTypes.set(t)), error: onErr })
    if (kind === 'res') this.resApi.remove(id).subscribe({ next: () => this.resApi.list(e).subscribe((r) => this.resources.set(r)), error: onErr })
    if (kind === 'price') this.priceApi.remove(id).subscribe({ next: () => this.priceApi.list(e).subscribe((p) => this.pricing.set(p)), error: onErr })
  }
}
