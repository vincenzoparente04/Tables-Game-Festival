import { Routes } from '@angular/router'
import { authGuard, notPendingGuard, requirePermission } from './core/guards'
import { Login } from './pages/login'
import { Dashboard } from './pages/dashboard'
import { Showcase } from './pages/showcase'
import { InvoicesPage } from './features/invoices/invoices-page'
import { GamesPage } from './features/games/games-page'
import { UsersPage } from './features/users/users-page'
import { EventsList } from './features/events/events-list'
import { EventForm } from './features/events/event-form'
import { EventDetail } from './features/events/event-detail'
import { ParticipantsList } from './features/participants/participants-list'
import { ResourcesPage } from './features/resources/resources-page'
import { BookingsList } from './features/bookings/bookings-list'
import { BookingDetail } from './features/bookings/booking-detail'

const staff = [authGuard, notPendingGuard]

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'showcase', component: Showcase },
  { path: 'dashboard', component: Dashboard, canActivate: staff },
  { path: 'events', component: EventsList, canActivate: [...staff, requirePermission('events', 'viewAll')] },
  { path: 'events/new', component: EventForm, canActivate: [...staff, requirePermission('events', 'create')] },
  { path: 'events/:id', component: EventDetail, canActivate: [...staff, requirePermission('events', 'viewAll')] },
  { path: 'participants', component: ParticipantsList, canActivate: [...staff, requirePermission('participants', 'view')] },
  { path: 'bookings', component: BookingsList, canActivate: [...staff, requirePermission('bookings', 'view')] },
  { path: 'bookings/:id', component: BookingDetail, canActivate: [...staff, requirePermission('bookings', 'view')] },
  { path: 'invoices', component: InvoicesPage, canActivate: [...staff, requirePermission('invoices', 'view')] },
  { path: 'resources', component: ResourcesPage, canActivate: [...staff, requirePermission('resources', 'view')] },
  { path: 'games', component: GamesPage, canActivate: [...staff, requirePermission('games', 'viewAll')] },
  { path: 'users', component: UsersPage, canActivate: [authGuard, requirePermission('users', 'view')] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
]
