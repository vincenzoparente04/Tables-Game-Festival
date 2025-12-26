import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../shared/auth/auth-service';

export enum Role {
  ADMIN = 'admin',
  SUPER_ORGANISATEUR = 'super organisateur',
  ORGANISATEUR = 'organisateur',
  BENEVOLE = 'benevole',
  VISITEUR = 'visiteur',
  USER = 'user'
}

// même configuration que le backend
const PERMISSIONS = {
  festivals: {
    viewAll: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    viewCurrent: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    setCourant: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    viewStocks: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR ]
  },
  zonesTarifaires: {
    view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
  },
  zonesPlan: {
    view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
  },
  reservations: {
    view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    updateWorkflow: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR]
  },
  jeux: {
    viewPublic: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
    viewAll: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    place: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR]
  },
  editeurs: {
    viewPublic: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
    viewAll: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
  },
  reservants: {
    view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
  },
  factures: {
    view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
    create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
    markPaid: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
  },
  users: {
    view: [Role.ADMIN],
    create: [Role.ADMIN],
    update: [Role.ADMIN],
    delete: [Role.ADMIN],
    validatePending: [Role.ADMIN],
    changeRole: [Role.ADMIN]
  }
};

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private authService = inject(AuthService);

  // Signal reactif du rôle actuel
  currentRole = computed(() => this.authService.currentUser()?.role ?? Role.USER);

  // Vérifier si l'utilisateur a une permission spécifique
  hasPermission(resource: keyof typeof PERMISSIONS, action: string): boolean {
    const role = this.currentRole() as Role;
    const allowedRoles = (PERMISSIONS[resource] as any)?.[action];
    
    if (!allowedRoles) {
      console.warn(`Permission non définie: ${resource}.${action}`);
      return false;
    }

    return allowedRoles.includes(role);
  }

  //computed pour une permission
  can(resource: keyof typeof PERMISSIONS, action: string) {
    return computed(() => this.hasPermission(resource, action));
  }

  isAdmin = computed(() => this.currentRole() === Role.ADMIN);
  isSuperOrganisateur = computed(() => this.currentRole() === Role.SUPER_ORGANISATEUR);
  isOrganisateur = computed(() => this.currentRole() === Role.ORGANISATEUR);
  isBenevole = computed(() => this.currentRole() === Role.BENEVOLE);
  isVisiteur = computed(() => this.currentRole() === Role.VISITEUR);
  isPendingUser = computed(() => this.currentRole() === Role.USER);

  isAdminOrSuperOrga = computed(() => 
    this.isAdmin() || this.isSuperOrganisateur()
  );

  isAdminOrSuperOrgaOrOrga = computed(() => 
    this.isAdmin() || this.isSuperOrganisateur() || this.isOrganisateur()
  );

  canAccessDashboard = computed(() => 
    this.isAdmin() || this.isSuperOrganisateur() || this.isOrganisateur()
  );

  // Vérifier si le compte est activé (pas USER)
  isAccountActivated = computed(() => this.currentRole() !== Role.USER);

}
