import { Injectable, computed, inject, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { catchError, finalize, map, of, tap } from 'rxjs'
import { environment } from '../../environments/environment'
import type { User } from './models'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient)
  private readonly api = environment.apiUrl

  private readonly _user = signal<User | null>(null)
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly currentUser = this._user.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()
  readonly isLoggedIn = computed(() => this._user() != null)
  readonly isAdmin = computed(() => this._user()?.role === 'admin')

  login(login: string, password: string) {
    this._loading.set(true)
    this._error.set(null)
    return this.http
      .post<{ user: User }>(`${this.api}/auth/login`, { login, password }, { withCredentials: true })
      .pipe(
        tap((res) => this._user.set(res?.user ?? null)),
        map(() => true),
        catchError((err) => {
          this._error.set(err.status === 401 ? 'Invalid credentials' : 'Server unreachable')
          this._user.set(null)
          return of(false)
        }),
        finalize(() => this._loading.set(false)),
      )
  }

  logout() {
    return this.http
      .post(`${this.api}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(null)),
        tap(() => this._user.set(null)),
      )
  }

  // Restores the session from the httpOnly cookie (call on app start).
  loadSession() {
    return this.http
      .get<{ user: User }>(`${this.api}/auth/whoami`, { withCredentials: true })
      .pipe(
        tap((res) => this._user.set(res?.user ?? null)),
        map(() => true),
        catchError(() => {
          this._user.set(null)
          return of(false)
        }),
      )
  }

  // Used by the interceptor to silently refresh the access token on 401.
  refresh$() {
    return this.http
      .post(`${this.api}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      )
  }
}
