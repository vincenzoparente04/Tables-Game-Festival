import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'

// Visitor-facing shell: dark theme scope, top navigation and footer.
@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="public-shell">
      <header class="pnav">
        <a routerLink="/" class="pbrand"><span class="logo">◆</span> Festival</a>
        <nav class="plinks">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Events</a>
        </nav>
        <span class="sp"></span>
        <a routerLink="/login" class="pbtn ghost sm">Organizer sign in</a>
      </header>
      <main class="pmain"><router-outlet /></main>
      <footer class="pfoot">
        <span class="pbrand sm"><span class="logo">◆</span> Festival</span>
        <span class="pmuted">Events, exhibitions &amp; concerts</span>
      </footer>
    </div>
  `,
  styles: `
    .pnav { display: flex; align-items: center; gap: 26px; padding: 18px max(24px, 5vw); position: sticky; top: 0; z-index: 20; background: rgba(11, 13, 20, 0.75); backdrop-filter: blur(14px); border-bottom: 1px solid var(--pub-border); }
    .pbrand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 17px; }
    .pbrand .logo { background: var(--pub-grad); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 19px; }
    .pbrand.sm { font-size: 14px; }
    .plinks { display: flex; gap: 18px; }
    .plinks a { color: var(--pub-muted); font-weight: 600; font-size: 14px; transition: color 0.15s; }
    .plinks a:hover, .plinks a.on { color: var(--pub-text); }
    .sp { flex: 1; }
    .pmain { min-height: calc(100vh - 160px); padding-bottom: 60px; }
    .pfoot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px max(24px, 5vw); border-top: 1px solid var(--pub-border); font-size: 13px; }
  `,
})
export class PublicLayout {}
