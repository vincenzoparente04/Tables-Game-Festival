import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { PermissionsService } from '../services/permissions-service';

// Guard  pour vérifier une permission spécifique
export function hasPermission(resource: string, action: string): CanActivateFn {
  return () => {
    const permissions = inject(PermissionsService);
    const router = inject(Router);

    if (permissions.hasPermission(resource as any, action)) {
      return true;
    }

    router.navigate(['/home']);
    return false;
  };
}

// Guard pour vérifier que le compte n'est pas en attente (USER)
export const notPendingUserGuard: CanActivateFn = () => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  if (!permissions.isPendingUser()) {
    return true;
  }

  router.navigate(['/pending-validation']);
  return false;
};

// Guard pour super organisateur ou admin
export const canManageFestivalsGuard: CanActivateFn = () => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  if (permissions.isAdminOrSuperOrga()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

// Guard pour organisateurs (admin, super orga, orga)
export const isOrganisateurGuard: CanActivateFn = () => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  if (permissions.isAdminOrSuperOrgaOrOrga()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};
