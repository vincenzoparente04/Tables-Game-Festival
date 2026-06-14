import { Component, ElementRef, inject, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { AuthService } from '../core/auth.service'

interface NeonDot {
  x: string // home offset from screen centre, e.g. "-23.4vw"
  y: string
  size: number
  color: string
  delay: string
}

// Palette-matched neon dots scattered across the screen. Hovering "Sign in"
// magnetises them onto the cursor (spring-ish CSS transition), then they spring
// back out on leave. Adapted from a React/framer-motion/lucide snippet.
const PALETTE = ['#3e7bfa', '#5b8efb', '#6d5cf6', '#8b5cf6', '#c084fc', '#3fc7c7']

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="nfield" [class.attract]="attracting()" [style.--cx]="cx() + 'px'" [style.--cy]="cy() + 'px'" aria-hidden="true">
      @for (d of dots(); track $index) {
        <span class="nb" [style.--hx]="d.x" [style.--hy]="d.y" [style.--s]="d.size + 'px'" [style.--c]="d.color" [style.--d]="d.delay"></span>
      }
    </div>

    <div class="auth">
      <div class="card auth-card">
        <div class="brand">festa<span class="dot">.</span></div>
        <h1>Sign in</h1>
        <p class="muted mono">Manage your events, bookings and invoices.</p>
        <form (ngSubmit)="submit()">
          <label for="login">Login</label>
          <input id="login" class="input" name="login" [(ngModel)]="login" autocomplete="username" />
          <label for="pwd">Password</label>
          <input id="pwd" class="input" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" />
          @if (error()) { <div class="err">{{ error() }}</div> }
          <button #signin class="btn btn-primary" type="submit" [disabled]="loading()"
                  (mouseenter)="onEnter($event)" (mousemove)="onMove($event)" (mouseleave)="onLeave()"
                  (focus)="onFocus()" (blur)="onLeave()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <a routerLink="/" class="muted sc-link">Browse public events →</a>
      </div>
    </div>
  `,
  styles: `
    .auth { min-height: 100vh; display: grid; place-items: center; padding: 24px; position: relative; }
    .auth-card { width: 100%; max-width: 380px; padding: 32px; position: relative; z-index: 1; }
    .brand { display: inline-flex; align-items: baseline; font-family: var(--font-display); font-weight: 700; font-size: 20px; letter-spacing: -0.02em; margin-bottom: 20px; }
    .brand .dot { color: var(--primary); }
    h1 { margin-bottom: 4px; }
    form { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
    form label { margin-top: 8px; font-family: var(--font-mono); }
    .btn-primary { margin-top: 16px; width: 100%; padding: 11px; font-family: var(--font-mono); }
    .err { color: var(--danger); background: var(--danger-50); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; }
    .sc-link { display: inline-block; margin-top: 18px; font-weight: 600; font-family: var(--font-mono); }

    /* Neon magnet field */
    .nfield { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 30; }
    .nb {
      position: fixed; left: 50vw; top: 50vh; width: var(--s); height: var(--s); margin: calc(var(--s) / -2);
      border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c), 0 0 13px var(--c); opacity: 0.42;
      transform: translate(var(--hx), var(--hy));
      transition: transform 1.15s cubic-bezier(0.22, 1, 0.36, 1) var(--d), opacity 0.5s ease;
      will-change: transform;
    }
    .nfield.attract .nb {
      opacity: 1;
      transform: translate(calc(var(--cx) - 50vw), calc(var(--cy) - 50vh));
      transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) var(--d), opacity 0.3s ease;
    }
    @media (prefers-reduced-motion: reduce) {
      .nb { transition: opacity 0.3s ease; }
      .nfield.attract .nb { transform: translate(var(--hx), var(--hy)); }
    }
  `,
})
export class Login {
  private auth = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private signin = viewChild.required<ElementRef<HTMLButtonElement>>('signin')

  login = ''
  password = ''
  readonly loading = this.auth.loading
  readonly error = this.auth.error

  readonly attracting = signal(false)
  readonly cx = signal(typeof window !== 'undefined' ? window.innerWidth / 2 : 640)
  readonly cy = signal(typeof window !== 'undefined' ? window.innerHeight / 2 : 420)
  readonly dots = signal<NeonDot[]>(
    Array.from({ length: 32 }, (_, i) => ({
      x: (Math.random() * 96 - 48).toFixed(1) + 'vw',
      y: (Math.random() * 92 - 46).toFixed(1) + 'vh',
      size: Math.random() < 0.28 ? 9 : 6,
      color: PALETTE[i % PALETTE.length]!,
      delay: (Math.random() * 0.14).toFixed(2) + 's',
    })),
  )

  onEnter(e: MouseEvent) {
    this.cx.set(e.clientX)
    this.cy.set(e.clientY)
    this.attracting.set(true)
  }

  onMove(e: MouseEvent) {
    if (this.attracting()) {
      this.cx.set(e.clientX)
      this.cy.set(e.clientY)
    }
  }

  onFocus() {
    const r = this.signin().nativeElement.getBoundingClientRect()
    this.cx.set(r.left + r.width / 2)
    this.cy.set(r.top + r.height / 2)
    this.attracting.set(true)
  }

  onLeave() {
    this.attracting.set(false)
  }

  submit() {
    this.auth.login(this.login, this.password).subscribe((ok) => {
      if (ok) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin/dashboard'
        this.router.navigateByUrl(returnUrl)
      }
    })
  }
}
