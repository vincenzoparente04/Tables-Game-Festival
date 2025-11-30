export var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["SUPER_ORGANISATEUR"] = "super organisateur";
    Role["ORGANISATEUR"] = "organisateur";
    Role["BENEVOLE"] = "benevole";
    Role["VISITEUR"] = "visiteur";
    Role["USER"] = "user";
})(Role || (Role = {}));
// Hiérarchie des rôles (du plus élevé au moins élevé)
export const ROLE_HIERARCHY = [
    Role.ADMIN,
    Role.SUPER_ORGANISATEUR,
    Role.ORGANISATEUR,
    Role.BENEVOLE,
    Role.VISITEUR,
    Role.USER
];
// Permissions par ressource
export const PERMISSIONS = {
    // FESTIVALS
    festivals: {
        viewAll: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        viewCurrent: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        setCourant: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        viewStocks: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR]
    },
    // ZONES TARIFAIRES
    zonesTarifaires: {
        view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
    },
    // ZONES PLAN
    zonesPlan: {
        view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.VISITEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
    },
    // RÉSERVATIONS
    reservations: {
        view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        updateWorkflow: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR]
    },
    // JEUX
    jeux: {
        viewPublic: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
        viewAll: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        place: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR] // Placer dans zones
    },
    // ÉDITEURS
    editeurs: {
        viewPublic: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR, Role.BENEVOLE, Role.VISITEUR],
        viewAll: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
    },
    // RÉSERVANTS
    reservants: {
        view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
    },
    // FACTURATION
    factures: {
        view: [Role.ADMIN, Role.SUPER_ORGANISATEUR, Role.ORGANISATEUR],
        create: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        update: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        delete: [Role.ADMIN, Role.SUPER_ORGANISATEUR],
        markPaid: [Role.ADMIN, Role.SUPER_ORGANISATEUR]
    },
    // UTILISATEURS
    users: {
        view: [Role.ADMIN],
        create: [Role.ADMIN],
        update: [Role.ADMIN],
        delete: [Role.ADMIN],
        validatePending: [Role.ADMIN],
        changeRole: [Role.ADMIN]
    }
};
// Fonction helper pour vérifier les permissions
export function hasPermission(userRole, permission) {
    return permission.includes(userRole);
}
// Fonction pour vérifier si un rôle a au moins le niveau d'un autre
export function hasMinimumRole(userRole, minimumRole) {
    const userIndex = ROLE_HIERARCHY.indexOf(userRole);
    const minIndex = ROLE_HIERARCHY.indexOf(minimumRole);
    if (userIndex === -1 || minIndex === -1)
        return false;
    return userIndex <= minIndex; // Plus petit index = rôle plus élevé
}
// Helper pour obtenir toutes les permissions d'un rôle
export function getRolePermissions(role) {
    const perms = {};
    for (const [resource, actions] of Object.entries(PERMISSIONS)) {
        perms[resource] = [];
        for (const [action, allowedRoles] of Object.entries(actions)) {
            if (hasPermission(role, allowedRoles)) {
                perms[resource].push(action);
            }
        }
    }
    return perms;
}
//# sourceMappingURL=roles.config.js.map