import { Component, inject } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { ThemeToggle } from '../shared/theme-toggle'
import { ThemeService } from '../core/theme.service'

// Visitor-facing shell: theme scope, top navigation, footer, theme toggle.
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  template: `
    <div class="public-shell">
      <header class="pnav">
        <a routerLink="/" class="pbrand">festa<span class="dot">.</span></a>
        <nav class="plinks">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" class="nav-ev">events</a>
        </nav>
        <span class="sp"></span>
        <app-theme-toggle />
        <a routerLink="/login" class="pbtn ghost sm mono">Organizer sign in</a>
      </header>
      <main class="pmain"><router-outlet /></main>
      <footer class="pfoot">
        <span class="pbrand sm">festa<span class="dot">.</span></span>
        <span class="pmono ftags"><span class="w-ev">events</span> · <span class="w-ex">exhibitions</span> · <span class="w-co">concerts</span></span>
      </footer>
    </div>
  `,
  styles: `
    .pnav { display: flex; align-items: center; gap: 26px; padding: 18px max(24px, 5vw); position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--pub-bg) 78%, transparent); backdrop-filter: blur(14px); border-bottom: 1px solid var(--pub-border); }
    .pbrand { display: inline-flex; align-items: baseline; font-family: var(--font-display); font-weight: 700; font-size: 19px; letter-spacing: -0.02em; }
    .pbrand .dot { color: var(--pub-accent); }
    .pbrand.sm { font-size: 15px; }
    .plinks { display: flex; gap: 18px; }
    .plinks a { color: var(--pub-muted); font-family: var(--font-mono); font-size: 13px; transition: color 0.15s; }
    .plinks a:hover, .plinks a.on { color: var(--pub-text); }
    .plinks a.nav-ev, .plinks a.nav-ev.on { color: #3e7bfa; }
    .plinks a.nav-ev:hover { color: #5b8efb; }
    .sp { flex: 1; }
    .pmain { min-height: calc(100vh - 160px); padding-bottom: 60px; }
    .pfoot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px max(24px, 5vw); border-top: 1px solid var(--pub-border); }
    .ftags { color: var(--pub-muted); }
    .ftags .w-ev { color: #3e7bfa; }
    .ftags .w-ex { color: #8b5cf6; }
    .ftags .w-co { color: #f2c53d; }
  `,
})
export class PublicLayout {
  readonly theme = inject(ThemeService)
}
