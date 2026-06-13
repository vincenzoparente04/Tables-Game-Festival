import { Routes } from '@angular/router'
import { PublicLayout } from './public-layout'

// Public visitor site: home, event pages, ticket-order lookup.
export default [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '', title: 'Festival — events, exhibitions & concerts',
        loadComponent: () => import('./home').then((m) => m.PublicHome),
      },
      {
        path: 'events/:slug', title: 'Event — Festival',
        loadComponent: () => import('./event-page').then((m) => m.PublicEventPage),
      },
      {
        path: 'orders/:code', title: 'Your order — Festival',
        loadComponent: () => import('./order-page').then((m) => m.PublicOrderPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
] satisfies Routes
