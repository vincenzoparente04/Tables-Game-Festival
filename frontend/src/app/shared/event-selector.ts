import { Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { EventContext } from '../core/event-context'

@Component({
  selector: 'app-event-selector',
  imports: [FormsModule],
  template: `
    @if (ctx.events().length) {
      <div class="sel">
        <span class="muted">Event</span>
        <select class="select" [ngModel]="ctx.selectedId()" (ngModelChange)="ctx.select($event)">
          @for (e of ctx.events(); track e.id) {
            <option [ngValue]="e.id">{{ e.name }}{{ e.is_current ? ' • current' : '' }}</option>
          }
        </select>
      </div>
    }
  `,
  styles: `.sel { display: flex; align-items: center; gap: 8px; } .select { width: auto; min-width: 240px; }`,
})
export class EventSelector {
  readonly ctx = inject(EventContext)
}
