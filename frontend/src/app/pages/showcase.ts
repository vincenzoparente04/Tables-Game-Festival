import { Component, OnInit, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { PublicApi } from '../core/api'
import type { PublicEvent } from '../core/models'

@Component({
  selector: 'app-showcase',
  imports: [RouterLink],
  template: `
    <header class="sc-head">
      <div class="brand"><span class="logo">◆</span> Festival Manager</div>
      <a routerLink="/login" class="btn btn-sm">Sign in</a>
    </header>
    <section class="hero">
      <h1>Discover events</h1>
      <p class="muted">Festivals, fairs, concerts, exhibitions and more — all in one place.</p>
    </section>
    <section class="grid">
      @for (e of events(); track e.id) {
        <article class="card sc-card">
          <span class="badge badge-primary">{{ e.event_type_label }}</span>
          <h3>{{ e.name }}</h3>
          @if (e.venue) { <div class="muted">{{ e.venue }}</div> }
          @if (e.start_date) { <div class="muted dates">{{ e.start_date }} → {{ e.end_date }}</div> }
          @if (e.description) { <p class="desc">{{ e.description }}</p> }
        </article>
      } @empty {
        <div class="card pad muted">No public events yet.</div>
      }
    </section>
  `,
  styles: `
    :host { display: block; max-width: 1100px; margin: 0 auto; padding: 24px; }
    .sc-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 28px; }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; }
    .brand .logo { color: var(--primary); }
    .hero { padding: 24px 0 32px; }
    .hero h1 { font-size: 34px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
    .sc-card { padding: 20px; display: flex; flex-direction: column; gap: 8px; transition: box-shadow 0.15s, transform 0.15s; }
    .sc-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
    .sc-card h3 { margin-top: 4px; }
    .dates { font-size: 13px; }
    .desc { margin: 4px 0 0; }
    .pad { padding: 24px; }
  `,
})
export class Showcase implements OnInit {
  private api = inject(PublicApi)
  readonly events = signal<PublicEvent[]>([])

  ngOnInit() {
    this.api.events().subscribe((e) => this.events.set(e))
  }
}
