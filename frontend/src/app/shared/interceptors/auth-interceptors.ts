import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth-service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const excluded = ['/auth/login', '/auth/logout', '/auth/refresh'];
  if (excluded.some(path => req.url.includes(path))) return next(req);

  // ajouter withCredentials: true (cookie httpOnly)
  const reqWithCreds = req.clone({ withCredentials: true });

  return next(reqWithCreds).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      return auth.refresh$().pipe(
        switchMap(ok => ok ? next(reqWithCreds) : throwError(() => err)),
        catchError(refreshErr => {
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};