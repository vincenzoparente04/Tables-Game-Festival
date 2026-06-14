import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ThemeService } from './core/theme.service'

// Bare root: the staff shell lives in admin/admin-layout.ts (under /admin),
// the public site renders at the root with its own layout. Injecting
// ThemeService here applies the saved theme before anything renders.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  private theme = inject(ThemeService)
}
