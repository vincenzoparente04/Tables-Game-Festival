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
      <div><h1>Events</h1><p class="muted">Manage all your events.</p></div>
      @if (canCreate()) { <a routerLink="/events/new" class="btn btn-primary">+ New event</a> }
    </div>

    @if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Name</th><th>Type</th><th>Dates</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (e of events(); track e.id) {
              <tr>
                <td><strong>{{ e.name }}</strong></td>
                <td><span class="badge">{{ typeLabels()[e.event_type_id] || '—' }}</span></td>
                <td class="muted">{{ e.start_date ? (e.start_date + ' → ' + e.end_date) : '—' }}</td>
                <td>
                  @if (e.is_current) { <span class="badge badge-success">Current</span> }
                  @else if (e.is_active) { <span class="badge">Active</span> }
                  @else { <span class="badge badge-warning">Inactive</span> }
                </td>
                <td><div class="actions">
                  @if (canSetCurrent() && !e.is_current) { <button class="btn btn-sm" (click)="setCurrent(e.id)">Set current</button> }
                  @if (canDelete()) { <button class="btn btn-sm" (click)="remove(e.id)">Delete</button> }
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No events yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
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
