import { Injectable, Signal, computed, inject } from '@angular/core'
import { AuthService } from './auth.service'

export enum Role {
  ADMIN = 'admin',
  SUPER_ORGANIZER = 'super_organizer',
  ORGANIZER = 'organizer',
  VOLUNTEER = 'volunteer',
  VISITOR = 'visitor',
  USER = 'user',
}

const ALL_STAFF = [Role.ADMIN, Role.SUPER_ORGANIZER, Role.ORGANIZER]
const ADMINS = [Role.ADMIN, Role.SUPER_ORGANIZER]
const EVERYONE = [Role.ADMIN, Role.SUPER_ORGANIZER, Role.ORGANIZER, Role.VOLUNTEER, Role.VISITOR]

// Mirrors the backend permission matrix (config/roles.config.ts).
export const PERMISSIONS: Record<string, Record<string, Role[]>> = {
  events: { viewAll: ALL_STAFF, viewCurrent: EVERYONE, create: ADMINS, update: ADMINS, delete: ADMINS, setCurrent: ADMINS, setFeatured: ADMINS },
  eventTypes: { view: EVERYONE, create: [Role.ADMIN], update: [Role.ADMIN], delete: [Role.ADMIN] },
  areas: { view: EVERYONE, create: ADMINS, update: ALL_STAFF, delete: ADMINS },
  resourceTypes: { view: ALL_STAFF, create: ADMINS, update: ADMINS, delete: ADMINS },
  resources: { view: ALL_STAFF, create: ADMINS, update: ALL_STAFF, delete: ADMINS },
  pricingTiers: { view: ALL_STAFF, create: ADMINS, update: ADMINS, delete: ADMINS },
  participants: { view: ALL_STAFF, create: ALL_STAFF, update: ALL_STAFF, delete: ADMINS },
  bookings: { view: ALL_STAFF, create: ALL_STAFF, update: ALL_STAFF, delete: ADMINS, updateWorkflow: ALL_STAFF },
  invoices: { view: ALL_STAFF, create: ADMINS, update: ADMINS, delete: ADMINS, markPaid: ADMINS },
  games: { viewPublic: EVERYONE, viewAll: ALL_STAFF, create: ADMINS, update: ALL_STAFF, delete: ADMINS },
  artists: { view: ALL_STAFF, create: ALL_STAFF, update: ALL_STAFF, delete: ADMINS },
  eventArtists: { view: ALL_STAFF, manage: ALL_STAFF },
  schedule: { view: ALL_STAFF, create: ALL_STAFF, update: ALL_STAFF, delete: ALL_STAFF },
  expenses: { view: ALL_STAFF, create: ALL_STAFF, update: ALL_STAFF, delete: ADMINS },
  finance: { view: ALL_STAFF },
  uploads: { create: ALL_STAFF, delete: ADMINS },
  eventImages: { view: ALL_STAFF, manage: ALL_STAFF },
  users: { view: [Role.ADMIN], create: [Role.ADMIN], update: [Role.ADMIN], delete: [Role.ADMIN], validatePending: [Role.ADMIN], changeRole: [Role.ADMIN] },
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly auth = inject(AuthService)

  readonly currentRole = computed(() => this.auth.currentUser()?.role ?? null)
  readonly isAdmin = computed(() => this.currentRole() === Role.ADMIN)
  readonly isStaff = computed(() => ALL_STAFF.includes(this.currentRole() as Role))
  readonly isPendingUser = computed(() => this.currentRole() === Role.USER)

  has(resource: string, action: string): boolean {
    const role = this.currentRole()
    if (!role) return false
    const allowed = PERMISSIONS[resource]?.[action]
    return !!allowed && allowed.includes(role as Role)
  }

  can(resource: string, action: string): Signal<boolean> {
    return computed(() => this.has(resource, action))
  }
}
