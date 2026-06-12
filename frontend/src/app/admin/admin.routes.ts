import { Routes } from '@angular/router'
import { authGuard, notPendingGuard, requirePermission } from '../core/guards'
import { AdminLayout } from './admin-layout'

const staff = [authGuard, notPendingGuard]

// Lazy admin area: each page is its own chunk behind the shared shell.
export default [
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard', title: 'Dashboard — Festival Manager', canActivate: staff,
        loadComponent: () => import('../pages/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'events', title: 'Events — Festival Manager',
        canActivate: [...staff, requirePermission('events', 'viewAll')],
        loadComponent: () => import('../features/events/events-list').then((m) => m.EventsList),
      },
      {
        path: 'events/new', title: 'New event — Festival Manager',
        canActivate: [...staff, requirePermission('events', 'create')],
        loadComponent: () => import('../features/events/event-form').then((m) => m.EventForm),
      },
      {
        path: 'events/:id', title: 'Event — Festival Manager',
        canActivate: [...staff, requirePermission('events', 'viewAll')],
        loadComponent: () => import('../features/events/event-detail').then((m) => m.EventDetail),
      },
      {
        path: 'artists', title: 'Artists — Festival Manager',
        canActivate: [...staff, requirePermission('artists', 'view')],
        loadComponent: () => import('./artists/artists-page').then((m) => m.ArtistsPage),
      },
      {
        path: 'participants', title: 'Participants — Festival Manager',
        canActivate: [...staff, requirePermission('participants', 'view')],
        loadComponent: () => import('../features/participants/participants-list').then((m) => m.ParticipantsList),
      },
      {
        path: 'bookings', title: 'Bookings — Festival Manager',
        canActivate: [...staff, requirePermission('bookings', 'view')],
        loadComponent: () => import('../features/bookings/bookings-list').then((m) => m.BookingsList),
      },
      {
        path: 'bookings/:id', title: 'Booking — Festival Manager',
        canActivate: [...staff, requirePermission('bookings', 'view')],
        loadComponent: () => import('../features/bookings/booking-detail').then((m) => m.BookingDetail),
      },
      {
        path: 'invoices', title: 'Invoices — Festival Manager',
        canActivate: [...staff, requirePermission('invoices', 'view')],
        loadComponent: () => import('../features/invoices/invoices-page').then((m) => m.InvoicesPage),
      },
      {
        path: 'resources', title: 'Resources & areas — Festival Manager',
        canActivate: [...staff, requirePermission('resources', 'view')],
        loadComponent: () => import('../features/resources/resources-page').then((m) => m.ResourcesPage),
      },
      {
        path: 'games', title: 'Games — Festival Manager',
        canActivate: [...staff, requirePermission('games', 'viewAll')],
        loadComponent: () => import('../features/games/games-page').then((m) => m.GamesPage),
      },
      {
        path: 'users', title: 'Users — Festival Manager',
        canActivate: [authGuard, requirePermission('users', 'view')],
        loadComponent: () => import('../features/users/users-page').then((m) => m.UsersPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
] satisfies Routes
