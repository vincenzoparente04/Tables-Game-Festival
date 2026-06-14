import { Component, HostListener, OnInit, inject, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { AreasApi, BookingsApi, ResourcesApi, VenueMapsApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import { MapCanvas } from '../../shared/venue-map/map-canvas'
import { MapGlyph } from '../../shared/venue-map/map-glyph'
import { Icon } from '../../shared/icon'
import { ELEMENT_KIND_META, kindMeta } from '../../shared/venue-map/venue-elements'
import type { EditorElement } from '../../shared/venue-map/venue-elements'
import { MapState } from './map-state'
import type { Area, Booking, Json, MapElement, ResourceModel, VenueMap } from '../../core/models'

@Component({
  selector: 'app-map-editor',
  imports: [FormsModule, RouterLink, MapCanvas, MapGlyph, Icon],
  template: `
    @if (!map()) {
      <div class="card empty">{{ loadError() || 'Loading…' }}</div>
    } @else {
      <div class="bar">
        <a routerLink="/admin/maps" class="link"><app-icon name="arrow-left" [size]="14" /> Maps</a>
        <h2 class="name">{{ map()!.name }}</h2>
        <label class="pub"><input type="checkbox" [ngModel]="map()!.is_public" (ngModelChange)="togglePublic($event)" /> public</label>
        <span class="spacer"></span>
        <span class="chip"><app-icon name="user" [size]="14" /> {{ state.capacityTotal() }} capacity</span>
        <span class="chip">{{ state.elements().length }} elements</span>
        <div class="tools">
          <button class="tool" title="Zoom out" (click)="canvas().zoomBy(1.25)"><app-icon name="zoom-out" [size]="17" /></button>
          <button class="tool" title="Zoom in" (click)="canvas().zoomBy(0.8)"><app-icon name="zoom-in" [size]="17" /></button>
          <button class="tool" title="Fit" (click)="canvas().zoomToFit()"><app-icon name="maximize" [size]="16" /></button>
          <button class="tool" [class.on]="grid()" title="Snap to grid" (click)="grid.set(!grid())"><app-icon name="grid" [size]="16" /></button>
          <button class="tool" title="Undo (Ctrl+Z)" [disabled]="!state.canUndo()" (click)="state.undo()"><app-icon name="undo" [size]="16" /></button>
          <button class="tool" title="Redo (Ctrl+Shift+Z)" [disabled]="!state.canRedo()" (click)="state.redo()"><app-icon name="redo" [size]="16" /></button>
        </div>
        @if (canEdit()) {
          <button class="btn btn-primary" (click)="save()" [disabled]="saving() || !state.dirty()">
            {{ saving() ? 'Saving…' : state.dirty() ? 'Save' : 'Saved' }}
          </button>
        }
        @if (saveError()) { <span class="err">{{ saveError() }}</span> }
      </div>

      <div class="editor">
        @if (canEdit()) {
          <aside class="palette">
            @for (k of kinds; track k.kind) {
              <button class="pal" [title]="k.label" (click)="addElement(k.kind)">
                <span class="pal-glyph" [style.color]="k.color"><app-map-glyph [kind]="k.kind" [size]="20" /></span>
                <span class="pal-label">{{ k.label }}</span>
              </button>
            }
          </aside>
        }

        <div class="canvas-wrap">
          <app-map-canvas
            [width]="map()!.width" [height]="map()!.height"
            [background]="bg()" [elements]="state.elements()"
            [editable]="canEdit()" [selectedId]="state.selectedId()"
            [showGrid]="grid()" [gridSize]="10"
            (select)="state.selectedId.set($event)"
            (gestureStart)="state.snapshot()"
            (change)="state.apply($event.id, $event.patch)"
          />
        </div>

        @if (canEdit() && state.selected(); as sel) {
          <aside class="props card">
            <div class="props-head">
              <span class="badge badge-primary" [style.color]="meta(sel.kind).color"><app-map-glyph [kind]="sel.kind" [size]="13" /> {{ meta(sel.kind).label }}</span>
            </div>
            <label class="p-field">Label
              <input class="input" [ngModel]="sel.label ?? ''" (ngModelChange)="patch(sel.id, { label: $event || null })" placeholder="e.g. Main Stage" />
            </label>
            <label class="p-field">Capacity (guests)
              <input class="input" type="number" min="0" [ngModel]="sel.capacity" (ngModelChange)="patch(sel.id, { capacity: numOrNull($event) })" />
            </label>
            <label class="p-field">Color
              <input class="color" type="color" [ngModel]="sel.color ?? meta(sel.kind).color" (ngModelChange)="patch(sel.id, { color: $event })" />
            </label>
            <div class="geo">
              <label>X<input class="input" type="number" [ngModel]="round(sel.x)" (ngModelChange)="patch(sel.id, { x: num($event) })" /></label>
              <label>Y<input class="input" type="number" [ngModel]="round(sel.y)" (ngModelChange)="patch(sel.id, { y: num($event) })" /></label>
              <label>W<input class="input" type="number" min="16" [ngModel]="round(sel.width)" (ngModelChange)="patch(sel.id, { width: Math.max(16, num($event)) })" /></label>
              <label>H<input class="input" type="number" min="16" [ngModel]="round(sel.height)" (ngModelChange)="patch(sel.id, { height: Math.max(16, num($event)) })" /></label>
              <label>rot°<input class="input" type="number" min="-360" max="360" step="15" [ngModel]="sel.rotation" (ngModelChange)="patch(sel.id, { rotation: num($event) })" /></label>
              <label>Z<input class="input" type="number" [ngModel]="sel.z_index" (ngModelChange)="patch(sel.id, { z_index: num($event) })" /></label>
            </div>
            <label class="p-field">Linked agreement (stand of…)
              <select class="select" [ngModel]="sel.booking_id" (ngModelChange)="patch(sel.id, { booking_id: $event })">
                <option [ngValue]="null">—</option>
                @for (b of bookings(); track b.id) { <option [ngValue]="b.id">{{ b.participant_name }} ({{ b.kind }})</option> }
              </select>
            </label>
            <label class="p-field">Linked resource
              <select class="select" [ngModel]="sel.resource_id" (ngModelChange)="patch(sel.id, { resource_id: $event })">
                <option [ngValue]="null">—</option>
                @for (r of resources(); track r.id) { <option [ngValue]="r.id">{{ r.label || ('Resource #' + r.id) }}</option> }
              </select>
            </label>
            <label class="p-field">Linked area
              <select class="select" [ngModel]="sel.area_id" (ngModelChange)="patch(sel.id, { area_id: $event })">
                <option [ngValue]="null">—</option>
                @for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
              </select>
            </label>
            <div class="p-actions">
              <button class="btn btn-sm" (click)="state.duplicate(sel.id)">Duplicate</button>
              <button class="btn btn-sm btn-danger" (click)="state.remove(sel.id)">Delete</button>
            </div>
            <p class="muted hint">Drag to move · corners to resize · arrows to nudge · Del to remove</p>
          </aside>
        }
      </div>
    }
  `,
  styles: `
    .bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .bar .link { color: var(--primary-600); font-weight: 600; }
    .name { font-size: 18px; }
    .pub { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-muted); }
    .spacer { flex: 1; }
    .chip { background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 5px 12px; font-size: 13px; font-weight: 600; }
    .tools { display: flex; gap: 4px; }
    .tool { border: 1px solid var(--border); background: var(--surface); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 15px; }
    .tool:hover:not(:disabled) { background: var(--surface-2); }
    .tool.on { background: var(--primary-50); border-color: var(--primary); }
    .tool:disabled { opacity: 0.4; cursor: default; }
    .err { color: var(--danger); font-size: 13px; }
    .editor { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; height: calc(100vh - var(--header-h) - 150px); min-height: 460px; }
    .palette { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; padding-right: 2px; }
    .pal { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 64px; padding: 7px 2px; border: 1px solid var(--border); background: var(--surface); border-radius: 10px; cursor: pointer; }
    .pal:hover { background: var(--primary-50); border-color: var(--primary); }
    .pal-glyph { font-size: 18px; }
    .pal-label { font-size: 10px; font-weight: 600; color: var(--text-muted); }
    .canvas-wrap { min-width: 0; }
    .props { width: 270px; padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    .props-head { display: flex; }
    .p-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--text-muted); }
    .color { width: 100%; height: 34px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 2px; }
    .geo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .geo label { display: flex; flex-direction: column; gap: 2px; font-size: 11px; font-weight: 600; color: var(--text-muted); }
    .p-actions { display: flex; gap: 8px; }
    .hint { font-size: 11px; }
  `,
})
export class MapEditor implements OnInit {
  readonly Math = Math
  private api = inject(VenueMapsApi)
  private bookingsApi = inject(BookingsApi)
  private resourcesApi = inject(ResourcesApi)
  private areasApi = inject(AreasApi)
  private route = inject(ActivatedRoute)
  private perms = inject(PermissionsService)

  readonly kinds = ELEMENT_KIND_META
  readonly state = new MapState()
  readonly map = signal<VenueMap | null>(null)
  readonly bookings = signal<Booking[]>([])
  readonly resources = signal<ResourceModel[]>([])
  readonly areas = signal<Area[]>([])
  readonly grid = signal(true)
  readonly saving = signal(false)
  readonly saveError = signal('')
  readonly loadError = signal('')

  readonly canEdit = this.perms.can('venueMaps', 'update')
  readonly canvas = viewChild.required(MapCanvas)

  private mapId = 0
  meta = kindMeta

  ngOnInit() {
    this.mapId = Number(this.route.snapshot.paramMap.get('id'))
    this.api.get(this.mapId).subscribe({
      next: (detail) => {
        this.applyDetail(detail)
        const eventId = detail.event_id
        this.bookingsApi.list(eventId).subscribe((b) => this.bookings.set(b))
        this.resourcesApi.list(eventId).subscribe((r) => this.resources.set(r))
        this.areasApi.list(eventId).subscribe((a) => this.areas.set(a))
      },
      error: (e) => this.loadError.set(e?.error?.error ?? 'Map not found'),
    })
  }

  bg() {
    return (this.map()?.background ?? []) as never[]
  }

  private applyDetail(detail: VenueMap) {
    this.map.set(detail)
    this.state.load((detail.elements ?? []).map((e: MapElement): EditorElement => ({
      id: e.id, kind: e.kind, label: e.label, x: e.x, y: e.y,
      width: e.width, height: e.height, rotation: e.rotation,
      capacity: e.capacity, color: e.color, z_index: e.z_index,
      area_id: e.area_id, resource_id: e.resource_id, booking_id: e.booking_id,
      booking_participant_name: e.booking_participant_name ?? null,
      resource_label: e.resource_label ?? null,
      area_name: e.area_name ?? null,
    })))
  }

  num = (v: unknown) => Number(v) || 0
  round = (v: number) => Math.round(v)
  numOrNull = (v: unknown) => (v === null || v === '' ? null : Number(v))

  patch(id: number, patch: Partial<EditorElement>) {
    this.state.apply(id, patch)
  }

  addElement(kind: string) {
    const m = this.map()
    if (!m) return
    const meta = kindMeta(kind)
    const offset = (this.state.elements().length % 5) * 24
    this.state.add({
      kind, label: null,
      x: Math.round(m.width / 2 - meta.width / 2) + offset,
      y: Math.round(m.height / 2 - meta.height / 2) + offset,
      width: meta.width, height: meta.height, rotation: 0,
      capacity: null, color: null, z_index: this.state.elements().length,
      area_id: null, resource_id: null, booking_id: null,
    })
  }

  togglePublic(isPublic: boolean) {
    const m = this.map()
    if (!m) return
    this.api.update(m.id, { is_public: isPublic }).subscribe((updated) =>
      this.map.set({ ...updated, elements: m.elements }),
    )
  }

  save() {
    const payload: Json[] = this.state.elements().map((e) => ({
      kind: e.kind,
      ...(e.label ? { label: e.label } : {}),
      x: e.x, y: e.y, width: e.width, height: e.height, rotation: e.rotation,
      ...(e.capacity != null ? { capacity: e.capacity } : {}),
      ...(e.color ? { color: e.color } : {}),
      z_index: e.z_index,
      ...(e.area_id != null ? { area_id: e.area_id } : {}),
      ...(e.resource_id != null ? { resource_id: e.resource_id } : {}),
      ...(e.booking_id != null ? { booking_id: e.booking_id } : {}),
    }))
    this.saving.set(true)
    this.saveError.set('')
    this.api.replaceElements(this.mapId, payload).subscribe({
      next: (detail) => { this.applyDetail(detail); this.saving.set(false) },
      error: (e) => {
        this.saveError.set(e?.error?.error ?? 'Save failed')
        this.saving.set(false)
      },
    })
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.state.dirty()) event.preventDefault()
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.canEdit()) return
    const target = event.target as HTMLElement
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) this.state.redo()
      else this.state.undo()
      return
    }
    const sel = this.state.selected()
    if (!sel) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault()
      this.state.duplicate(sel.id)
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      this.state.remove(sel.id)
      return
    }
    if (event.key === 'Escape') {
      this.state.selectedId.set(null)
      return
    }
    const step = event.shiftKey ? 10 : 2
    const nudge: Record<string, { dx: number; dy: number }> = {
      ArrowUp: { dx: 0, dy: -step }, ArrowDown: { dx: 0, dy: step },
      ArrowLeft: { dx: -step, dy: 0 }, ArrowRight: { dx: step, dy: 0 },
    }
    const move = nudge[event.key]
    if (move) {
      event.preventDefault()
      this.state.apply(sel.id, { x: sel.x + move.dx, y: sel.y + move.dy })
    }
  }
}
