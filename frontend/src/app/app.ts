import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

// Bare root: the staff shell lives in admin/admin-layout.ts (under /admin),
// the public site renders at the root with its own layout.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
