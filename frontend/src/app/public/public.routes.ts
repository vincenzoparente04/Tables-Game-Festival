import { Routes } from '@angular/router'

// Public visitor site at the root. Phase G replaces the showcase with the
// full event pages (home, event detail, checkout, order lookup).
export default [
  {
    path: '', title: 'Events — Festival Manager',
    loadComponent: () => import('../pages/showcase').then((m) => m.Showcase),
  },
  { path: '**', redirectTo: '' },
] satisfies Routes
