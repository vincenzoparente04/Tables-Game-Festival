import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from './auth.service'
import { PermissionsService } from './permissions'

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService)
  const router = inject(Router)
  if (auth.isLoggedIn()) return true
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } })
  return false
}

export const notPendingGuard: CanActivateFn = () => {
  const perms = inject(PermissionsService)
  const router = inject(Router)
  if (!perms.isPendingUser()) return true
  router.navigate(['/pending'])
  return false
}

export function requirePermission(resource: string, action: string): CanActivateFn {
  return () => {
    const perms = inject(PermissionsService)
    const router = inject(Router)
    if (perms.has(resource, action)) return true
    router.navigate(['/dashboard'])
    return false
  }
}
