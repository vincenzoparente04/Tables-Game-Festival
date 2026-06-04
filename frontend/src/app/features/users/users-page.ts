import { Component, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { UsersApi } from '../../core/api'
import type { User } from '../../core/models'

const ROLES = ['admin', 'super_organizer', 'organizer', 'volunteer', 'visitor', 'user']

@Component({
  selector: 'app-users-page',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Users</h1><p class="muted">Manage accounts and roles.</p></div>
      <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ Add user' }}</button>
    </div>

    @if (showForm()) {
      <div class="card pad addf">
        <div class="form-grid">
          <div class="field"><label>First name</label><input class="input" name="fn" [(ngModel)]="form.first_name" /></div>
          <div class="field"><label>Last name</label><input class="input" name="ln" [(ngModel)]="form.last_name" /></div>
          <div class="field"><label>Email</label><input class="input" type="email" name="em" [(ngModel)]="form.email" /></div>
          <div class="field"><label>Login</label><input class="input" name="lg" [(ngModel)]="form.login" /></div>
          <div class="field"><label>Password</label><input class="input" type="password" name="pw" [(ngModel)]="form.password" /></div>
          <div class="field"><label>Role</label><select class="select" name="rl" [(ngModel)]="form.role">@for (r of roles; track r) { <option [value]="r">{{ r }}</option> }</select></div>
        </div>
        @if (error()) { <div class="err">{{ error() }}</div> }
        <button class="btn btn-primary" (click)="add()" [disabled]="!canSubmit() || saving()">Create user</button>
      </div>
    }

    @if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Login</th><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td><strong>{{ u.login }}</strong></td>
                <td class="muted">{{ u.first_name }} {{ u.last_name }}</td>
                <td class="muted">{{ u.email }}</td>
                <td>
                  <select class="select role-sel" [ngModel]="u.role" (ngModelChange)="changeRole(u.id, $event)">
                    @for (r of roles; track r) { <option [value]="r">{{ r }}</option> }
                  </select>
                </td>
                <td><div class="actions"><button class="btn btn-sm btn-danger" (click)="remove(u.id)">Delete</button></div></td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">No users.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .addf { margin-bottom: 16px; }
    .role-sel { width: auto; min-width: 150px; padding: 5px 10px; }
    .err { color: var(--danger); background: var(--danger-50); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 12px; }
  `,
})
export class UsersPage implements OnInit {
  private api = inject(UsersApi)

  readonly roles = ROLES
  readonly users = signal<User[]>([])
  readonly loading = signal(true)
  readonly showForm = signal(false)
  readonly saving = signal(false)
  readonly error = signal<string | null>(null)
  form = { first_name: '', last_name: '', email: '', login: '', password: '', role: 'organizer' }

  ngOnInit() { this.load() }

  private load() {
    this.loading.set(true)
    this.api.list().subscribe((u) => { this.users.set(u); this.loading.set(false) })
  }

  canSubmit() {
    return this.form.email.trim() && this.form.login.trim().length >= 3 && this.form.password.length >= 8
  }

  add() {
    if (!this.canSubmit()) return
    this.saving.set(true)
    this.error.set(null)
    const f = this.form
    const body: Record<string, unknown> = { email: f.email.trim(), login: f.login.trim(), password: f.password, role: f.role }
    if (f.first_name.trim()) body['first_name'] = f.first_name.trim()
    if (f.last_name.trim()) body['last_name'] = f.last_name.trim()
    this.api.create(body).subscribe({
      next: () => { this.form = { first_name: '', last_name: '', email: '', login: '', password: '', role: 'organizer' }; this.saving.set(false); this.showForm.set(false); this.load() },
      error: (e) => { this.error.set(e?.error?.error ?? 'Could not create user'); this.saving.set(false) },
    })
  }

  changeRole(id: number, role: string) {
    this.api.changeRole(id, role).subscribe()
  }

  remove(id: number) {
    if (confirm('Delete this user?')) this.api.remove(id).subscribe(() => this.load())
  }
}
