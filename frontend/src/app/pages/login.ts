import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { AuthService } from '../core/auth.service'

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth">
      <div class="card auth-card">
        <div class="brand"><span class="logo">◆</span> Festival Manager</div>
        <h1>Sign in</h1>
        <p class="muted">Manage your events, bookings and invoices.</p>
        <form (ngSubmit)="submit()">
          <label for="login">Login</label>
          <input id="login" class="input" name="login" [(ngModel)]="login" autocomplete="username" />
          <label for="pwd">Password</label>
          <input id="pwd" class="input" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" />
          @if (error()) { <div class="err">{{ error() }}</div> }
          <button class="btn btn-primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <a routerLink="/" class="muted sc-link">Browse public events →</a>
      </div>
    </div>
  `,
  styles: `
    .auth { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .auth-card { width: 100%; max-width: 380px; padding: 32px; }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 20px; }
    .brand .logo { color: var(--primary); }
    h1 { margin-bottom: 4px; }
    form { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
    form label { margin-top: 8px; }
    .btn-primary { margin-top: 16px; width: 100%; padding: 11px; }
    .err { color: var(--danger); background: var(--danger-50); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; }
    .sc-link { display: inline-block; margin-top: 18px; font-weight: 600; }
  `,
})
export class Login {
  private auth = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  login = ''
  password = ''
  readonly loading = this.auth.loading
  readonly error = this.auth.error

  submit() {
    this.auth.login(this.login, this.password).subscribe((ok) => {
      if (ok) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin/dashboard'
        this.router.navigateByUrl(returnUrl)
      }
    })
  }
}
