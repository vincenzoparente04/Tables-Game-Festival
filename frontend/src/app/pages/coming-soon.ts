import { Component, inject } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-coming-soon',
  template: `
    <div class="page-head"><h1>{{ title }}</h1></div>
    <div class="card cs">
      <div class="cs-icon">🛠️</div>
      <h2>{{ title }} — coming soon</h2>
      <p class="muted">This section is being rebuilt on the new generic backend.</p>
    </div>
  `,
  styles: `
    .page-head { margin-bottom: 20px; }
    .cs { padding: 56px 24px; text-align: center; }
    .cs-icon { font-size: 40px; margin-bottom: 8px; }
    .cs h2 { margin-bottom: 6px; }
  `,
})
export class ComingSoon {
  private route = inject(ActivatedRoute)
  readonly title = (this.route.snapshot.data['title'] as string) ?? 'Section'
}
