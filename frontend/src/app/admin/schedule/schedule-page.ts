import { Component, OnInit, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { AreasApi, ArtistsApi, ScheduleSlotsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import { Icon } from '../../shared/icon'
import type { Area, Artist, Json, ScheduleSlot } from '../../core/models'

const SLOT_KINDS = ['performance', 'exhibition', 'talk', 'workshop', 'screening', 'other']
const SLOT_STATUSES = ['tentative', 'confirmed', 'cancelled']

// 'YYYY-MM-DDTHH:mm' (datetime-local, browser timezone) ⇄ ISO 8601
export function localToIso(local: string): string {
  return new Date(local).toISOString()
}
export function isoToLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const dayOf = (iso: string) => isoToLocal(iso).slice(0, 10)
const timeOf = (iso: string) => isoToLocal(iso).slice(11, 16)

@Component({
  selector: 'app-schedule-page',
  imports: [FormsModule, EventSelector, Icon],
  template: `
    <div class="page-head">
      <div><h1>Schedule</h1><p class="muted">Programme: who plays/exhibits where, and when.</p></div>
    </div>
    <div class="toolbar">
      <app-event-selector />
      <span class="spacer"></span>
      @if (canCreate() && ctx.selectedId()) {
        <button class="btn btn-primary" (click)="startCreate()">{{ showForm() ? 'Cancel' : '+ New slot' }}</button>
      }
    </div>

    @if (showForm()) {
      <div class="card pad addf">
        <h3>{{ editingId() ? 'Edit slot' : 'New slot' }}</h3>
        <div class="form-grid">
          <div class="field"><label>Title *</label>
            <input class="input" [(ngModel)]="form.title" placeholder="e.g. Opening live set" />
          </div>
          <div class="field"><label>Kind</label>
            <select class="select" [(ngModel)]="form.kind">
              @for (k of kinds; track k) { <option [value]="k">{{ k }}</option> }
            </select>
          </div>
          <div class="field"><label>Artist</label>
            <select class="select" [(ngModel)]="form.artist_id">
              <option [ngValue]="null">—</option>
              @for (a of artists(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
            </select>
          </div>
          <div class="field"><label>Area / stage</label>
            <select class="select" [(ngModel)]="form.area_id">
              <option [ngValue]="null">—</option>
              @for (a of areas(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
            </select>
          </div>
          <div class="field"><label>Starts *</label>
            <input class="input" type="datetime-local" [(ngModel)]="form.starts_at" />
          </div>
          <div class="field"><label>Ends *</label>
            <input class="input" type="datetime-local" [(ngModel)]="form.ends_at" />
          </div>
          <div class="field"><label>Status</label>
            <select class="select" [(ngModel)]="form.status">
              @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
            </select>
          </div>
          <div class="field check"><label><input type="checkbox" [(ngModel)]="form.is_public" /> Visible on the public page</label></div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving() || !form.title.trim() || !form.starts_at || !form.ends_at">
            {{ saving() ? 'Saving…' : 'Save slot' }}
          </button>
          @if (error()) { <span class="err">{{ error() }}</span> }
        </div>
      </div>
    }

    @if (warnings().length) {
      <div class="card pad warn">
        <div>
          @for (w of warnings(); track w) { <div><app-icon name="alert" [size]="14" /> {{ w }}</div> }
        </div>
        <button class="btn btn-sm" (click)="warnings.set([])">Dismiss</button>
      </div>
    }

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else if (days().length === 0) {
      <div class="card empty">No slots scheduled yet. Add the first one.</div>
    } @else {
      <div class="tabs">
        @for (d of days(); track d) {
          <button class="tab" [class.on]="selectedDay() === d" (click)="selectedDay.set(d)">{{ d }}</button>
        }
      </div>

      @for (group of groupedByArea(); track group.name) {
        <div class="card pad area-block">
          <h3>{{ group.name }}</h3>
          @for (s of group.slots; track s.id) {
            <div class="slot" [class.cancelled]="s.status === 'cancelled'">
              <span class="time">{{ time(s.starts_at) }}–{{ time(s.ends_at) }}</span>
              <div class="what">
                <strong>{{ s.title }}</strong>
                @if (s.artist_name) { <span class="muted"> · {{ s.artist_name }}</span> }
              </div>
              <span class="badge">{{ s.kind }}</span>
              <span class="badge" [class]="statusClass(s.status)">{{ s.status }}</span>
              @if (!s.is_public) { <span class="badge badge-warning">hidden</span> }
              <span class="spacer"></span>
              @if (canUpdate()) { <button class="btn btn-sm" (click)="startEdit(s)">Edit</button> }
              @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(s)">Delete</button> }
            </div>
          }
        </div>
      }
    }
  `,
  styles: `
    .addf { margin-bottom: 16px; }
    .addf h3 { margin-bottom: 12px; }
    .check { display: flex; align-items: end; }
    .check label { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .err { color: var(--danger); font-size: 13px; }
    .warn { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; background: var(--warning-50); border-color: var(--warning); }
    .tabs { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
    .tab { border: 1px solid var(--border); background: var(--surface); border-radius: 999px; padding: 6px 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; font-size: 13px; }
    .tab.on { background: var(--primary-50); color: var(--primary-600); border-color: var(--primary-600); }
    .area-block { margin-bottom: 14px; }
    .area-block h3 { margin-bottom: 8px; }
    .slot { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .slot:last-child { border-bottom: none; }
    .slot.cancelled { opacity: 0.5; }
    .time { font-family: monospace; font-size: 13px; font-weight: 700; color: var(--primary-600); min-width: 96px; }
    .what { min-width: 200px; }
  `,
})
export class SchedulePage implements OnInit {
  readonly ctx = inject(EventContext)
  private api = inject(ScheduleSlotsApi)
  private areasApi = inject(AreasApi)
  private artistsApi = inject(ArtistsApi)
  private perms = inject(PermissionsService)

  readonly kinds = SLOT_KINDS
  readonly statuses = SLOT_STATUSES
  readonly slots = signal<ScheduleSlot[]>([])
  readonly areas = signal<Area[]>([])
  readonly artists = signal<Artist[]>([])
  readonly loading = signal(false)
  readonly showForm = signal(false)
  readonly saving = signal(false)
  readonly error = signal('')
  readonly warnings = signal<string[]>([])
  readonly editingId = signal<number | null>(null)
  readonly selectedDay = signal('')

  form = {
    title: '', kind: 'performance', artist_id: null as number | null,
    area_id: null as number | null, starts_at: '', ends_at: '',
    status: 'confirmed', is_public: true,
  }

  readonly canCreate = this.perms.can('schedule', 'create')
  readonly canUpdate = this.perms.can('schedule', 'update')
  readonly canDelete = this.perms.can('schedule', 'delete')

  readonly days = computed(() => {
    const set = new Set(this.slots().map((s) => dayOf(s.starts_at)))
    return [...set].sort()
  })

  readonly groupedByArea = computed(() => {
    const day = this.selectedDay()
    const daySlots = this.slots()
      .filter((s) => dayOf(s.starts_at) === day)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    const groups = new Map<string, ScheduleSlot[]>()
    for (const s of daySlots) {
      const key = s.area_name ?? 'No area assigned'
      const list = groups.get(key) ?? []
      list.push(s)
      groups.set(key, list)
    }
    return [...groups.entries()].map(([name, slots]) => ({ name, slots }))
  })

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() {
    this.ctx.ensureLoaded()
    this.artistsApi.list().subscribe((a) => this.artists.set(a))
  }

  time = timeOf

  statusClass(status: string) {
    return status === 'confirmed' ? 'badge-success' : status === 'tentative' ? 'badge-warning' : 'badge-danger'
  }

  private load(eventId: number) {
    this.loading.set(true)
    this.api.list(eventId).subscribe((s) => {
      this.slots.set(s)
      this.loading.set(false)
      const days = this.days()
      if (days.length && !days.includes(this.selectedDay())) this.selectedDay.set(days[0]!)
    })
    this.areasApi.list(eventId).subscribe((a) => this.areas.set(a))
  }

  startCreate() {
    if (this.showForm()) { this.showForm.set(false); return }
    this.editingId.set(null)
    const day = this.selectedDay() || new Date().toISOString().slice(0, 10)
    this.form = {
      title: '', kind: 'performance', artist_id: null, area_id: null,
      starts_at: `${day}T20:00`, ends_at: `${day}T21:00`,
      status: 'confirmed', is_public: true,
    }
    this.error.set('')
    this.showForm.set(true)
  }

  startEdit(s: ScheduleSlot) {
    this.editingId.set(s.id)
    this.form = {
      title: s.title, kind: s.kind, artist_id: s.artist_id, area_id: s.area_id,
      starts_at: isoToLocal(s.starts_at), ends_at: isoToLocal(s.ends_at),
      status: s.status, is_public: s.is_public,
    }
    this.error.set('')
    this.showForm.set(true)
  }

  save() {
    const eventId = this.ctx.selectedId()
    if (!eventId || !this.form.title.trim() || !this.form.starts_at || !this.form.ends_at) return
    const body: Json = {
      title: this.form.title.trim(),
      kind: this.form.kind,
      starts_at: localToIso(this.form.starts_at),
      ends_at: localToIso(this.form.ends_at),
      status: this.form.status,
      is_public: this.form.is_public,
      artist_id: this.form.artist_id,
      area_id: this.form.area_id,
    }
    this.saving.set(true)
    this.error.set('')
    const editing = this.editingId()
    const req = editing
      ? this.api.update(editing, body)
      : this.api.create({ ...body, event_id: eventId, artist_id: this.form.artist_id ?? undefined, area_id: this.form.area_id ?? undefined } as Json)
    req.subscribe({
      next: (slot) => {
        this.warnings.set(slot.warnings ?? [])
        this.saving.set(false)
        this.showForm.set(false)
        this.editingId.set(null)
        this.load(eventId)
      },
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Could not save slot')
        this.saving.set(false)
      },
    })
  }

  remove(s: ScheduleSlot) {
    if (confirm(`Delete "${s.title}"?`)) {
      this.api.remove(s.id).subscribe(() => {
        const id = this.ctx.selectedId()
        if (id) this.load(id)
      })
    }
  }
}
