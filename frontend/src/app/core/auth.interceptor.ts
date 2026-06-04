import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, switchMap, throwError } from 'rxjs'
import { AuthService } from './auth.service'

// Sends the httpOnly cookie with every request; on a 401, tries a silent
// refresh once and replays the request.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService)
  const withCreds = req.clone({ withCredentials: true })

  const isAuthCall = ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/whoami'].some((p) =>
    req.url.includes(p),
  )
  if (isAuthCall) return next(withCreds)

  return next(withCreds).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err)
      return auth.refresh$().pipe(
        switchMap((ok) => (ok ? next(withCreds) : throwError(() => err))),
      )
    }),
  )
}
