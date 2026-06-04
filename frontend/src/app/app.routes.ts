import { Routes } from '@angular/router'
import { authGuard, notPendingGuard, requirePermission } from './core/guards'
import { Login } from './pages/login'
import { Dashboard } from './pages/dashboard'
import { Showcase } from './pages/showcase'
import { ComingSoon } from './pages/coming-soon'

const staff = [authGuard, notPendingGuard]

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'showcase', component: Showcase },
  { path: 'dashboard', component: Dashboard, canActivate: staff },
  { path: 'events', component: ComingSoon, data: { title: 'Events' }, canActivate: [...staff, requirePermission('events', 'viewAll')] },
  { path: 'participants', component: ComingSoon, data: { title: 'Participants' }, canActivate: [...staff, requirePermission('participants', 'view')] },
  { path: 'bookings', component: ComingSoon, data: { title: 'Bookings' }, canActivate: [...staff, requirePermission('bookings', 'view')] },
  { path: 'invoices', component: ComingSoon, data: { title: 'Invoices' }, canActivate: [...staff, requirePermission('invoices', 'view')] },
  { path: 'resources', component: ComingSoon, data: { title: 'Resources & areas' }, canActivate: [...staff, requirePermission('resources', 'view')] },
  { path: 'games', component: ComingSoon, data: { title: 'Games' }, canActivate: [...staff, requirePermission('games', 'viewAll')] },
  { path: 'users', component: ComingSoon, data: { title: 'Users' }, canActivate: [authGuard, requirePermission('users', 'view')] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
]
