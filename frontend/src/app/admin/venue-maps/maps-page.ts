import { Component, OnInit, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { VenueMapsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import type { Json, VenueMap, VenueTemplate } from '../../core/models'
import type { BackgroundShape } from '../../shared/venue-map/venue-elements'

@Component({
  selector: 'app-maps-page',
  imports: [FormsModule, RouterLink, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Venue maps</h1><p class="muted">Lay out stages, stands and services on your grounds.</p></div>
    </div>
    <div class="toolbar">
      <app-event-selector />
      <span class="spacer"></span>
      @if (canCreate() && ctx.selectedId()) {
        <button class="btn btn-primary" (click)="showCreate.set(!showCreate())">{{ showCreate() ? 'Cancel' : '+ New map' }}</button>
      }
    </div>

    @if (showCreate()) {
      <div class="card pad create">
        <h3>New map</h3>
        <label class="field name-field">Map name *
          <input class="input" [(ngModel)]="newName" placeholder="e.g. Festival grounds" />
        </label>
        <p class="muted pick">Pick a starting template:</p>
        <div class="tpl-grid">
          <button class="tpl" [class.on]="pickedTemplate() === null" (click)="pickedTemplate.set(null)">
            <div class="tpl-preview blank">Blank</div>
            <strong>Blank canvas</strong>
            <span class="muted sm">Empty 1200×800 ground</span>
          </button>
          @for (t of templates(); track t.key) {
            <button class="tpl" [class.on]="pickedTemplate() === t.key" (click)="pickedTemplate.set(t.key)">
              <svg class="tpl-preview" [attr.viewBox]="'0 0 ' + t.canvas.width + ' ' + t.canvas.height" preserveAspectRatio="xMidYMid meet">
                <rect x="0" y="0" [attr.width]="t.canvas.width" [attr.height]="t.canvas.height" fill="#f7f5ef" />
                @for (bg of shapes(t); track $index) {
                  @if (bg.shape === 'ellipse') {
                    <ellipse [attr.cx]="(bg.x ?? 0) + (bg.width ?? 0) / 2" [attr.cy]="(bg.y ?? 0) + (bg.height ?? 0) / 2"
                             [attr.rx]="(bg.width ?? 0) / 2" [attr.ry]="(bg.height ?? 0) / 2" [attr.fill]="bg.color ?? '#ccc'" opacity="0.7" />
                  } @else {
                    <rect [attr.x]="bg.x ?? 0" [attr.y]="bg.y ?? 0" [attr.width]="bg.width ?? 0" [attr.height]="bg.height ?? 0"
                          [attr.fill]="bg.color ?? '#ccc'" opacity="0.7" />
                  }
                }
              </svg>
              <strong>{{ t.label }}</strong>
              <span class="muted sm">{{ t.description }}</span>
            </button>
          }
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="create()" [disabled]="!newName.trim() || creating()">
            {{ creating() ? 'Creating…' : 'Create map' }}
          </button>
          @if (error()) { <span class="err">{{ error() }}</span> }
        </div>
      </div>
    }

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="cards">
        @for (m of maps(); track m.id) {
          <div class="card map-card">
            <h3>{{ m.name }}</h3>
            <div class="muted sm">
              {{ m.template_key ? 'Template: ' + m.template_key : 'Blank canvas' }} · {{ m.width }}×{{ m.height }}
              @if (!m.is_public) { · <span class="badge badge-warning">hidden</span> }
            </div>
            <div class="row-actions">
              <a class="btn btn-sm btn-primary" [routerLink]="['/admin/maps', m.id]">Open editor</a>
              @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(m)">Delete</button> }
            </div>
          </div>
        } @empty {
          <div class="card empty">No maps yet — create one from a venue template.</div>
        }
      </div>
    }
  `,
  styles: `
    .create { margin-bottom: 18px; }
    .create h3 { margin-bottom: 12px; }
    .name-field { max-width: 360px; margin-bottom: 12px; }
    .pick { margin-bottom: 10px; }
    .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .tpl { text-align: left; background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-sm); padding: 10px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
    .tpl.on { border-color: var(--primary); background: var(--primary-50); }
    .tpl-preview { width: 100%; aspect-ratio: 3/2; border-radius: 8px; background: #f7f5ef; border: 1px solid var(--border); }
    .tpl-preview.blank { display: grid; place-items: center; color: var(--text-muted); font-weight: 600; }
    .sm { font-size: 12px; }
    .actions { display: flex; align-items: center; gap: 10px; }
    .err { color: var(--danger); font-size: 13px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
    .map-card { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
    .row-actions { display: flex; gap: 8px; margin-top: 8px; }
  `,
})
export class MapsPage implements OnInit {
  readonly ctx = inject(EventContext)
  private api = inject(VenueMapsApi)
  private perms = inject(PermissionsService)

  readonly maps = signal<VenueMap[]>([])
  readonly templates = signal<VenueTemplate[]>([])
  readonly loading = signal(false)
  readonly showCreate = signal(false)
  readonly creating = signal(false)
  readonly error = signal('')
  readonly pickedTemplate = signal<string | null>('park')
  newName = ''

  readonly canCreate = this.perms.can('venueMaps', 'create')
  readonly canDelete = this.perms.can('venueMaps', 'delete')

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() {
    this.ctx.ensureLoaded()
    this.api.templates().subscribe((t) => this.templates.set(t))
  }

  shapes(t: VenueTemplate): BackgroundShape[] {
    return t.background as unknown as BackgroundShape[]
  }

  private load(eventId: number) {
    this.loading.set(true)
    this.api.list(eventId).subscribe((m) => { this.maps.set(m); this.loading.set(false) })
  }

  create() {
    const eventId = this.ctx.selectedId()
    if (!eventId || !this.newName.trim()) return
    const body: Json = { event_id: eventId, name: this.newName.trim() }
    if (this.pickedTemplate()) body['template_key'] = this.pickedTemplate()
    this.creating.set(true)
    this.error.set('')
    this.api.create(body).subscribe({
      next: () => {
        this.creating.set(false)
        this.showCreate.set(false)
        this.newName = ''
        this.load(eventId)
      },
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Could not create map')
        this.creating.set(false)
      },
    })
  }

  remove(m: VenueMap) {
    if (confirm(`Delete map "${m.name}" and all its elements?`)) {
      this.api.remove(m.id).subscribe(() => {
        const id = this.ctx.selectedId()
        if (id) this.load(id)
      })
    }
  }
}
