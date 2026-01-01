import { Routes } from '@angular/router';
import { Login } from './shared/auth/login/login';
import { Home } from './home/home';
import { Admin } from './admin/admin/admin';
import { authGuard } from './shared/auth/auth-guard';
import { adminGuard } from './admin/admin-guard';
import { Register } from './shared/auth/register/register';
import { FestivalsList } from './festivals/festivals-list/festivals-list';
import { notPendingUserGuard, hasPermission } from './guards/permission-guard';
import { ZonesPlanList } from './zones-plan/zones-plan-list/zones-plan-list';
import { VuesPubliques } from './vues-publiques/vues-publiques';
import { EditeursList } from './editeurs/editeur-list/editeurs-list';
import { JeuxList } from './jeux/jeux-list/jeux-list';
import { ReservantsList } from './reservant/reservants-list/reservants-list';
import { ReservationsList } from './reservations/reservations-list/reservations-list';





export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'register', component: Register},
    { path: 'festivals', component: FestivalsList , canActivate: [authGuard, notPendingUserGuard, hasPermission('festivals', 'viewAll')] },
    { path: 'festivals/courant', component: FestivalsList , canActivate: [authGuard, notPendingUserGuard, hasPermission('festivals', 'viewCurrent')] },
    { path: 'festivals/:id/zones-plan', component: ZonesPlanList, canActivate: [authGuard, notPendingUserGuard, hasPermission('zonesPlan', 'view')] },
    { path: 'home', component: Home },
    { path: 'vues-publiques', component: VuesPubliques, canActivate: [authGuard, notPendingUserGuard] },
    { path: 'editeurs', component: EditeursList, canActivate: [authGuard, notPendingUserGuard, hasPermission('festivals', 'viewAll')]},
    { path: 'jeux', component: JeuxList, canActivate: [authGuard, notPendingUserGuard, hasPermission('festivals', 'viewAll')]},
    { path: 'reservants', component: ReservantsList, canActivate: [authGuard, notPendingUserGuard, hasPermission('reservants', 'view')]},
    { path: 'admin', component: Admin, canActivate: [authGuard, adminGuard] },
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: '**', redirectTo: 'home' },
]
