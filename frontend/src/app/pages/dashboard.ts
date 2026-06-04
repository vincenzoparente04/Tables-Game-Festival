import { Component, OnInit, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { EventsApi } from '../core/api'
import type { EventModel, EventStats } from '../core/models'

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <h1>Dashboard</h1>
      <p class="muted">Overview of your current event.</p>
    </div>

    @if (loading()) {
      <div class="card pad muted">Loading…</div>
    } @else if (!current()) {
      <div class="card pad">No current event set. <a routerLink="/events" class="link">Manage events →</a></div>
    } @else {
      <div class="card pad banner">
        <div>
          <div class="muted">Current event</div>
          <h2>{{ current()!.name }}</h2>
        </div>
        @if (current()!.start_date) {
          <span class="badge">{{ current()!.start_date }} → {{ current()!.end_date }}</span>
        }
      </div>

      <div class="kpis">
        <div class="card kpi"><div class="muted">Bookings</div><div class="val">{{ stats()?.bookings_total }}</div></div>
        <div class="card kpi"><div class="muted">Participants</div><div class="val">{{ stats()?.participants_total }}</div></div>
        <div class="card kpi"><div class="muted">Resources booked</div><div class="val">{{ stats()?.resources_booked }}<span class="sub"> / {{ stats()?.resources_capacity }}</span></div></div>
        <div class="card kpi"><div class="muted">Revenue invoiced</div><div class="val">€{{ stats()?.revenue_invoiced }}</div><div class="muted sub">€{{ stats()?.revenue_paid }} paid</div></div>
      </div>

      <div class="card pad">
        <h3>Bookings by stage</h3>
        <div class="stages">
          @for (s of stats()?.bookings_by_stage ?? []; track s.key) {
            <div class="stage"><span class="badge badge-primary">{{ s.label || 'Unassigned' }}</span><strong>{{ s.count }}</strong></div>
          } @empty {
            <div class="muted">No bookings yet.</div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .page-head { margin-bottom: 20px; }
    .pad { padding: 20px 22px; }
    .link { color: var(--primary-600); font-weight: 600; }
    .banner { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .kpi { padding: 18px 20px; }
    .kpi .val { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .kpi .sub { font-size: 14px; font-weight: 500; color: var(--text-muted); }
    .stages { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .stage { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface-2); border-radius: var(--radius-sm); }
  `,
})
export class Dashboard implements OnInit {
  private events = inject(EventsApi)
  readonly current = signal<EventModel | null>(null)
  readonly stats = signal<EventStats | null>(null)
  readonly loading = signal(true)

  ngOnInit() {
    this.events.current().subscribe({
      next: (ev) => {
        this.current.set(ev)
        if (ev) {
          this.events.stats(ev.id).subscribe({
            next: (s) => { this.stats.set(s); this.loading.set(false) },
            error: () => this.loading.set(false),
          })
        } else {
          this.loading.set(false)
        }
      },
      error: () => this.loading.set(false),
    })
  }
}
