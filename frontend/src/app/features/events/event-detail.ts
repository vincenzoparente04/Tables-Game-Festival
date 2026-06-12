import { Component, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { EventsApi, EventTypesApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import type { EventModel, EventStats } from '../../core/models'

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink],
  template: `
    <a routerLink="/admin/events" class="link back">← Events</a>

    @if (loading()) {
      <div class="card empty">Loading…</div>
    } @else if (!event()) {
      <div class="card empty">Event not found.</div>
    } @else {
      <div class="page-head">
        <div>
          <div class="row">
            <h1>{{ event()!.name }}</h1>
            @if (event()!.is_current) { <span class="badge badge-success">Current</span> }
          </div>
          <p class="muted">
            <span class="badge badge-primary">{{ typeLabel() }}</span>
            @if (event()!.start_date) { &nbsp; 🗓 {{ event()!.start_date }} → {{ event()!.end_date }} }
            @if (event()!.venue) { &nbsp; 📍 {{ event()!.venue }} }
          </p>
        </div>
        @if (canSetCurrent() && !event()!.is_current) {
          <button class="btn btn-primary" (click)="setCurrent()">Set as current</button>
        }
      </div>

      <div class="kpis">
        <div class="card kpi"><div class="muted">Bookings</div><div class="val">{{ stats()?.bookings_total ?? 0 }}</div></div>
        <div class="card kpi"><div class="muted">Participants</div><div class="val">{{ stats()?.participants_total ?? 0 }}</div></div>
        <div class="card kpi"><div class="muted">Resources booked</div><div class="val">{{ stats()?.resources_booked ?? 0 }}<span class="sub"> / {{ stats()?.resources_capacity ?? 0 }}</span></div></div>
        <div class="card kpi"><div class="muted">Revenue invoiced</div><div class="val">€{{ stats()?.revenue_invoiced ?? 0 }}</div><div class="muted sub">€{{ stats()?.revenue_paid ?? 0 }} paid</div></div>
      </div>

      <div class="card pad">
        <h3>Bookings by stage</h3>
        <div class="stages">
          @for (s of stats()?.bookings_by_stage ?? []; track s.key) {
            <div class="stage"><span class="badge badge-primary">{{ s.label || 'Unassigned' }}</span><strong>{{ s.count }}</strong></div>
          } @empty { <div class="muted">No bookings yet.</div> }
        </div>
      </div>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .kpi { padding: 18px 20px; }
    .kpi .val { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .kpi .sub { font-size: 14px; font-weight: 500; color: var(--text-muted); }
    .stages { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .stage { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface-2); border-radius: var(--radius-sm); }
  `,
})
export class EventDetail implements OnInit {
  private api = inject(EventsApi)
  private typesApi = inject(EventTypesApi)
  private route = inject(ActivatedRoute)
  private perms = inject(PermissionsService)

  readonly event = signal<EventModel | null>(null)
  readonly stats = signal<EventStats | null>(null)
  readonly typeLabel = signal<string>('Event')
  readonly loading = signal(true)
  readonly canSetCurrent = this.perms.can('events', 'setCurrent')

  private id = 0

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'))
    this.typesApi.list().subscribe((ts) => {
      const ev = this.event()
      if (ev) this.typeLabel.set(ts.find((t) => t.id === ev.event_type_id)?.label ?? 'Event')
    })
    this.load()
  }

  private load() {
    this.api.get(this.id).subscribe({
      next: (ev) => {
        this.event.set(ev)
        this.typesApi.list().subscribe((ts) =>
          this.typeLabel.set(ts.find((t) => t.id === ev.event_type_id)?.label ?? 'Event'),
        )
        this.api.stats(this.id).subscribe({
          next: (s) => { this.stats.set(s); this.loading.set(false) },
          error: () => this.loading.set(false),
        })
      },
      error: () => this.loading.set(false),
    })
  }

  setCurrent() {
    this.api.setCurrent(this.id).subscribe((ev) => this.event.set(ev))
  }
}
