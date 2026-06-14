import { Component, OnInit, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { PublicApi } from '../core/api'
import { Reveal } from './reveal'
import { Icon } from '../shared/icon'
import type { PublicEvent } from '../core/models'

const today = () => new Date().toISOString().slice(0, 10)

@Component({
  selector: 'app-public-home',
  imports: [RouterLink, Reveal, Icon],
  template: `
    @if (featured(); as f) {
      <section class="hero" [style.background-image]="heroBg(f)">
        <div class="hero-inner">
          <div class="hero-meta">
            <span class="pchip grad"><app-icon name="star" [size]="13" /> Featured</span>
            <span class="pchip">{{ f.event_type_label }}</span>
            @if (f.start_date) { <span class="pchip"><app-icon name="calendar" [size]="14" /> {{ dates(f) }}</span> }
            @if (f.venue) { <span class="pchip"><app-icon name="map-pin" [size]="14" /> {{ f.venue }}</span> }
          </div>
          <h1 class="hero-title">{{ f.name }}</h1>
          @if (f.subtitle) { <p class="hero-sub">{{ f.subtitle }}</p> }
          <a class="pbtn hero-cta" [routerLink]="['/events', f.slug]">Discover the event →</a>
        </div>
      </section>
    } @else if (!loading()) {
      <section class="hero plain">
        <div class="hero-inner">
          <h1 class="hero-title">Live events,<br />unforgettable nights.</h1>
          <p class="hero-sub pmuted">Exhibitions, festivals and concerts — find your next one here.</p>
        </div>
      </section>
    }

    <section class="block" appReveal>
      <h2>Upcoming events</h2>
      @if (loading()) {
        <div class="pcard skel"></div>
      } @else {
        <div class="grid">
          @for (e of upcoming(); track e.id) {
            <a class="pcard ev" [routerLink]="['/events', e.slug]">
              <div class="ev-img" [style.background-image]="heroBg(e)">
                <span class="pchip type">{{ e.event_type_label }}</span>
              </div>
              <div class="ev-body">
                <h3>{{ e.name }}</h3>
                @if (e.subtitle) { <p class="pmuted sub">{{ e.subtitle }}</p> }
                <div class="pmuted meta">
                  @if (e.start_date) { <span><app-icon name="calendar" [size]="13" /> {{ dates(e) }}</span> }
                  @if (e.venue) { <span><app-icon name="map-pin" [size]="13" /> {{ e.venue }}</span> }
                </div>
              </div>
            </a>
          } @empty {
            <div class="pcard empty-card pmuted">No upcoming events announced yet — check back soon.</div>
          }
        </div>
      }
    </section>

    @if (past().length) {
      <section class="block" appReveal>
        <h2 class="pmuted">Past events</h2>
        <div class="past">
          @for (e of past(); track e.id) {
            <a class="pchip past-chip" [routerLink]="['/events', e.slug]">{{ e.name }}</a>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .hero { margin: 0 max(24px, 5vw); margin-top: 26px; border-radius: 24px; background-size: cover; background-position: center; position: relative; overflow: hidden; border: 1px solid var(--pub-border); }
    .hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, rgba(11, 13, 20, 0.92) 25%, rgba(11, 13, 20, 0.45) 70%, rgba(79, 70, 229, 0.25)); }
    .hero.plain::before { background: var(--pub-grad); opacity: 0.18; }
    .hero-inner { position: relative; padding: clamp(48px, 9vw, 110px) clamp(24px, 6vw, 80px); max-width: 760px; }
    .hero-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
    .hero-title { font-size: clamp(34px, 6vw, 64px); font-weight: 800; line-height: 1.05; margin-bottom: 14px; }
    .hero-sub { font-size: clamp(15px, 2vw, 19px); color: var(--pub-muted); max-width: 480px; margin-bottom: 26px; }
    .hero-cta { font-size: 15px; }
    .block { padding: 44px max(24px, 5vw) 0; }
    .block h2 { font-size: 22px; margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 20px; }
    .ev { display: flex; flex-direction: column; overflow: hidden; transition: transform 0.18s, border-color 0.18s; }
    .ev:hover { transform: translateY(-4px); border-color: var(--pub-accent); }
    .ev-img { aspect-ratio: 16/8; background: var(--pub-grad); background-size: cover; background-position: center; position: relative; }
    .ev-img .type { position: absolute; top: 10px; left: 10px; background: rgba(11, 13, 20, 0.7); }
    .ev-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 6px; }
    .ev-body h3 { font-size: 18px; }
    .sub { font-size: 13px; }
    .meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; }
    .empty-card { padding: 40px; text-align: center; }
    .skel { height: 180px; animation: pulse 1.4s infinite; }
    @keyframes pulse { 50% { opacity: 0.5; } }
    .past { display: flex; gap: 10px; flex-wrap: wrap; }
    .past-chip:hover { background: var(--pub-surface-2); }
  `,
})
export class PublicHome implements OnInit {
  private api = inject(PublicApi)

  readonly events = signal<PublicEvent[]>([])
  readonly loading = signal(true)

  readonly featured = computed(() =>
    this.events().find((e) => e.is_featured)
      ?? this.upcoming()[0]
      ?? null,
  )
  readonly upcoming = computed(() =>
    this.events().filter((e) => !e.end_date || e.end_date >= today()),
  )
  readonly past = computed(() =>
    this.events().filter((e) => e.end_date && e.end_date < today()),
  )

  ngOnInit() {
    this.api.events().subscribe({
      next: (e) => { this.events.set(e); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }

  heroBg(e: PublicEvent): string {
    return e.hero_image_url ? `url('${e.hero_image_url}')` : 'var(--pub-grad)'
  }

  dates(e: PublicEvent): string {
    if (!e.start_date) return ''
    return e.end_date && e.end_date !== e.start_date ? `${e.start_date} → ${e.end_date}` : e.start_date
  }
}
