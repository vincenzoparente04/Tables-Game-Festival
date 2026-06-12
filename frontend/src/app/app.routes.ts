import { Routes } from '@angular/router'
import { Login } from './pages/login'

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign in — Festival Manager' },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes') },
  { path: 'showcase', redirectTo: '' }, // legacy URL
  // Everything else is the public visitor site (it owns the wildcard).
  { path: '', loadChildren: () => import('./public/public.routes') },
]
