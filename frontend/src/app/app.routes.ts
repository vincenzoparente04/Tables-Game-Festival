import { Routes } from '@angular/router';
import { Login } from './shared/auth/login/login';
import { Home } from './home/home';
import { Admin } from './admin/admin/admin';
import { authGuard } from './shared/auth/auth-guard';
import { adminGuard } from './admin/admin-guard';
import { Register } from './shared/auth/register/register';
import { FestivalsList } from './festivals/festivals-list/festivals-list';
import { notPendingUserGuard, hasPermission } from './guards/permission-guard';



export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'register', component: Register},
    { path: 'festivals', component: FestivalsList , canActivate: [authGuard, notPendingUserGuard, hasPermission('festivals', 'viewAll')] },
    { path: 'festivals/courant', component: FestivalsList , canActivate: [authGuard, notPendingUserGuard, hasPermission('festivals', 'viewCurrent')] },
    { path: 'home', component: Home },
    { path: 'admin', component: Admin, canActivate: [authGuard, adminGuard] },
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: '**', redirectTo: 'home' },
]
