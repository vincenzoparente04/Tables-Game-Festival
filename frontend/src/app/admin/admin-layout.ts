import { Component, inject } from '@angular/core'
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router'
import { AuthService } from '../core/auth.service'
import { PermissionsService } from '../core/permissions'

// Staff shell: sidebar + topbar around every /admin page. The public site
// renders at the root with its own layout.
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="logo">◆</span> Festival Manager</div>
        <nav>
          <a routerLink="/admin/dashboard" routerLinkActive="active">Dashboard</a>
          @if (canEvents()) { <a routerLink="/admin/events" routerLinkActive="active">Events</a> }
          @if (canParticipants()) { <a routerLink="/admin/participants" routerLinkActive="active">Participants</a> }
          @if (canBookings()) { <a routerLink="/admin/bookings" routerLinkActive="active">Bookings</a> }
          @if (canResources()) { <a routerLink="/admin/resources" routerLinkActive="active">Resources &amp; areas</a> }
          @if (canInvoices()) { <a routerLink="/admin/invoices" routerLinkActive="active">Invoices</a> }
          @if (canGames()) { <a routerLink="/admin/games" routerLinkActive="active">Games</a> }
          @if (canUsers()) { <a routerLink="/admin/users" routerLinkActive="active">Users</a> }
        </nav>
        <div class="sidebar-foot">
          <a routerLink="/">View public site</a>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="spacer"></div>
          <div class="user">
            <div class="user-meta">
              <span class="user-name">{{ user()?.login }}</span>
              <span class="badge badge-primary">{{ user()?.role }}</span>
            </div>
            <button class="btn btn-sm" (click)="logout()">Log out</button>
          </div>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: var(--sidebar-w) 1fr; min-height: 100vh; }
    .sidebar { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 18px 14px; gap: 6px; position: sticky; top: 0; height: 100vh; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; padding: 6px 10px 16px; }
    .brand .logo { color: var(--primary); font-size: 18px; }
    nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    nav a, .sidebar-foot a { display: block; padding: 9px 12px; border-radius: var(--radius-sm); color: var(--text-muted); font-weight: 600; transition: background 0.15s, color 0.15s; }
    nav a:hover, .sidebar-foot a:hover { background: var(--surface-2); color: var(--text); }
    nav a.active { background: var(--primary-50); color: var(--primary-600); }
    .sidebar-foot { border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px; }
    .main { display: flex; flex-direction: column; min-width: 0; }
    .topbar { height: var(--header-h); display: flex; align-items: center; gap: 16px; padding: 0 28px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 5; }
    .spacer { flex: 1; }
    .user { display: flex; align-items: center; gap: 14px; }
    .user-meta { display: flex; align-items: center; gap: 8px; }
    .user-name { font-weight: 600; }
    .content { padding: 28px; max-width: 1200px; width: 100%; }
  `,
})
export class AdminLayout {
  private auth = inject(AuthService)
  private perms = inject(PermissionsService)
  private router = inject(Router)

  readonly user = this.auth.currentUser

  readonly canEvents = this.perms.can('events', 'viewAll')
  readonly canParticipants = this.perms.can('participants', 'view')
  readonly canBookings = this.perms.can('bookings', 'view')
  readonly canResources = this.perms.can('resources', 'view')
  readonly canInvoices = this.perms.can('invoices', 'view')
  readonly canGames = this.perms.can('games', 'viewAll')
  readonly canUsers = this.perms.can('users', 'view')

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']))
  }
}
