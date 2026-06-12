// Roles and the RBAC permission matrix (English).
// Role values match the `users.role` CHECK constraint in the database.

export enum Role {
  ADMIN = 'admin',
  SUPER_ORGANIZER = 'super_organizer',
  ORGANIZER = 'organizer',
  VOLUNTEER = 'volunteer',
  VISITOR = 'visitor',
  USER = 'user',
}

// Hierarchy from highest to lowest privilege.
export const ROLE_HIERARCHY: Role[] = [
  Role.ADMIN,
  Role.SUPER_ORGANIZER,
  Role.ORGANIZER,
  Role.VOLUNTEER,
  Role.VISITOR,
  Role.USER,
]

export type PermissionMatrix = Record<string, Record<string, Role[]>>

const ALL_STAFF = [Role.ADMIN, Role.SUPER_ORGANIZER, Role.ORGANIZER]
const ADMINS = [Role.ADMIN, Role.SUPER_ORGANIZER]
const EVERYONE = [Role.ADMIN, Role.SUPER_ORGANIZER, Role.ORGANIZER, Role.VOLUNTEER, Role.VISITOR]

// Permissions per resource. Each route declares requirePermission(resource, action).
export const PERMISSIONS: PermissionMatrix = {
  events: {
    viewAll: ALL_STAFF,
    viewCurrent: EVERYONE,
    create: ADMINS,
    update: ADMINS,
    delete: ADMINS,
    setCurrent: ADMINS,
    setFeatured: ADMINS,
  },
  eventTypes: {
    view: EVERYONE,
    create: [Role.ADMIN],
    update: [Role.ADMIN],
    delete: [Role.ADMIN],
  },
  areas: {
    view: EVERYONE,
    create: ADMINS,
    update: ALL_STAFF,
    delete: ADMINS,
  },
  resourceTypes: {
    view: ALL_STAFF,
    create: ADMINS,
    update: ADMINS,
    delete: ADMINS,
  },
  resources: {
    view: ALL_STAFF,
    create: ADMINS,
    update: ALL_STAFF,
    delete: ADMINS,
  },
  pricingTiers: {
    view: ALL_STAFF,
    create: ADMINS,
    update: ADMINS,
    delete: ADMINS,
  },
  participants: {
    view: ALL_STAFF,
    create: ALL_STAFF,
    update: ALL_STAFF,
    delete: ADMINS,
  },
  bookings: {
    view: ALL_STAFF,
    create: ALL_STAFF,
    update: ALL_STAFF,
    delete: ADMINS,
    updateWorkflow: ALL_STAFF,
  },
  invoices: {
    view: ALL_STAFF,
    create: ADMINS,
    update: ADMINS,
    delete: ADMINS,
    markPaid: ADMINS,
  },
  games: {
    viewPublic: EVERYONE,
    viewAll: ALL_STAFF,
    create: ADMINS,
    update: ALL_STAFF,
    delete: ADMINS,
  },
  artists: {
    view: ALL_STAFF,
    create: ALL_STAFF,
    update: ALL_STAFF,
    delete: ADMINS,
  },
  eventArtists: {
    view: ALL_STAFF,
    manage: ALL_STAFF,
  },
  schedule: {
    view: ALL_STAFF,
    create: ALL_STAFF,
    update: ALL_STAFF,
    delete: ALL_STAFF,
  },
  expenses: {
    view: ALL_STAFF,
    create: ALL_STAFF,
    update: ALL_STAFF,
    delete: ADMINS,
  },
  finance: {
    view: ALL_STAFF,
  },
  uploads: {
    create: ALL_STAFF,
    delete: ADMINS,
  },
  eventImages: {
    view: ALL_STAFF,
    manage: ALL_STAFF,
  },
  users: {
    view: [Role.ADMIN],
    create: [Role.ADMIN],
    update: [Role.ADMIN],
    delete: [Role.ADMIN],
    validatePending: [Role.ADMIN],
    changeRole: [Role.ADMIN],
  },
}

// True if the role is among the allowed roles for a permission.
export function hasPermission(userRole: string, permission: Role[]): boolean {
  return permission.includes(userRole as Role)
}

// True if userRole is at least as privileged as minimumRole.
export function hasMinimumRole(userRole: string, minimumRole: Role): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole as Role)
  const minIndex = ROLE_HIERARCHY.indexOf(minimumRole)
  if (userIndex === -1 || minIndex === -1) return false
  return userIndex <= minIndex // lower index = higher privilege
}

// All granted permissions for a role, grouped by resource.
export function getRolePermissions(role: string): Record<string, string[]> {
  const perms: Record<string, string[]> = {}
  for (const [resource, actions] of Object.entries(PERMISSIONS)) {
    perms[resource] = []
    for (const [action, allowedRoles] of Object.entries(actions)) {
      if (hasPermission(role, allowedRoles)) {
        perms[resource]!.push(action)
      }
    }
  }
  return perms
}
