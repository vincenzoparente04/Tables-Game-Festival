import { Component, OnInit, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { EventsApi, EventTypesApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import type { EventModel } from '../../core/models'

@Component({
  selector: 'app-events-list',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div><h1>Events</h1><p class="muted">{{ events().length }} event(s)</p></div>
      @if (canCreate()) { <a routerLink="/admin/events/new" class="btn btn-primary">+ New event</a> }
    </div>

    @if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="cards">
        @for (e of events(); track e.id) {
          <div class="card clickable ev" [routerLink]="['/admin/events', e.id]">
            <div class="ev-top">
              <span class="badge badge-primary">{{ typeLabels()[e.event_type_id] || 'Event' }}</span>
              @if (e.is_current) { <span class="badge badge-success">Current</span> }
              @else if (!e.is_active) { <span class="badge badge-warning">Inactive</span> }
            </div>
            <h3 class="ev-name">{{ e.name }}</h3>
            @if (e.venue) { <div class="muted ev-line">📍 {{ e.venue }}</div> }
            <div class="muted ev-line">🗓 {{ e.start_date ? (e.start_date + ' → ' + e.end_date) : 'No dates set' }}</div>
            <div class="ev-actions">
              @if (canSetCurrent() && !e.is_current) {
                <button class="btn btn-sm" (click)="$event.stopPropagation(); setCurrent(e.id)">Set current</button>
              }
              @if (canDelete()) {
                <button class="btn btn-sm btn-danger" (click)="$event.stopPropagation(); remove(e.id)">Delete</button>
              }
              <span class="spacer"></span>
              <span class="open">Open →</span>
            </div>
          </div>
        } @empty {
          <div class="card empty">No events yet. Create your first one.</div>
        }
      </div>
    }
  `,
  styles: `
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
    .ev { padding: 20px; display: flex; flex-direction: column; gap: 8px; }
    .ev-top { display: flex; align-items: center; gap: 8px; }
    .ev-name { margin-top: 4px; }
    .ev-line { font-size: 13px; }
    .ev-actions { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
    .ev-actions .spacer { flex: 1; }
    .open { color: var(--primary-600); font-weight: 600; font-size: 13px; }
  `,
})
export class EventsList implements OnInit {
  private api = inject(EventsApi)
  private typesApi = inject(EventTypesApi)
  private perms = inject(PermissionsService)

  readonly events = signal<EventModel[]>([])
  readonly typeLabels = signal<Record<number, string>>({})
  readonly loading = signal(true)
  readonly canCreate = this.perms.can('events', 'create')
  readonly canSetCurrent = this.perms.can('events', 'setCurrent')
  readonly canDelete = this.perms.can('events', 'delete')

  ngOnInit() {
    this.typesApi.list().subscribe((ts) =>
      this.typeLabels.set(Object.fromEntries(ts.map((t) => [t.id, t.label]))),
    )
    this.load()
  }

  private load() {
    this.loading.set(true)
    this.api.list().subscribe((e) => {
      this.events.set(e)
      this.loading.set(false)
    })
  }

  setCurrent(id: number) {
    this.api.setCurrent(id).subscribe(() => this.load())
  }

  remove(id: number) {
    if (confirm('Delete this event and all its data?')) {
      this.api.remove(id).subscribe(() => this.load())
    }
  }
}
