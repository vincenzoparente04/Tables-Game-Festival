import { Component, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { EventsApi, EventTypesApi } from '../../core/api'
import type { EventType } from '../../core/models'

@Component({
  selector: 'app-event-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>New event</h1>
        <p class="muted">Default resource types &amp; pricing are provisioned automatically (editable after).</p>
      </div>
      <a routerLink="/admin/events" class="btn">Cancel</a>
    </div>

    <div class="card pad" style="max-width: 660px">
      <form (ngSubmit)="submit()">
        <div class="field">
          <label for="type">Event type</label>
          <select id="type" class="select" name="type" [(ngModel)]="model.event_type_id" required>
            <option [ngValue]="null" disabled>Select a type…</option>
            @for (t of eventTypes(); track t.id) { <option [ngValue]="t.id">{{ t.label }}</option> }
          </select>
        </div>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" class="input" name="name" [(ngModel)]="model.name" required />
        </div>
        <div class="form-grid">
          <div class="field"><label for="sd">Start date</label><input id="sd" class="input" type="date" name="sd" [(ngModel)]="model.start_date" /></div>
          <div class="field"><label for="ed">End date</label><input id="ed" class="input" type="date" name="ed" [(ngModel)]="model.end_date" /></div>
        </div>
        <div class="field"><label for="venue">Venue</label><input id="venue" class="input" name="venue" [(ngModel)]="model.venue" /></div>
        <div class="field"><label for="desc">Description</label><textarea id="desc" class="input" rows="3" name="desc" [(ngModel)]="model.description"></textarea></div>
        @if (error()) { <div class="err">{{ error() }}</div> }
        <button class="btn btn-primary" type="submit" [disabled]="saving() || !model.event_type_id || !model.name.trim()">
          {{ saving() ? 'Creating…' : 'Create event' }}
        </button>
      </form>
    </div>
  `,
  styles: `.err { color: var(--danger); background: var(--danger-50); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 12px; }`,
})
export class EventForm implements OnInit {
  private api = inject(EventsApi)
  private typesApi = inject(EventTypesApi)
  private router = inject(Router)

  readonly eventTypes = signal<EventType[]>([])
  readonly saving = signal(false)
  readonly error = signal<string | null>(null)

  model = {
    event_type_id: null as number | null,
    name: '',
    start_date: '',
    end_date: '',
    venue: '',
    description: '',
  }

  ngOnInit() {
    this.typesApi.list().subscribe((t) => this.eventTypes.set(t))
  }

  submit() {
    if (!this.model.event_type_id || !this.model.name.trim()) return
    this.saving.set(true)
    this.error.set(null)
    const m = this.model
    const slug = m.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const body: Record<string, unknown> = {
      event_type_id: Number(m.event_type_id),
      name: m.name.trim(),
      slug,
      apply_template: true,
    }
    if (m.start_date) body['start_date'] = m.start_date
    if (m.end_date) body['end_date'] = m.end_date
    if (m.venue.trim()) body['venue'] = m.venue.trim()
    if (m.description.trim()) body['description'] = m.description.trim()

    this.api.create(body).subscribe({
      next: () => this.router.navigate(['/admin/events']),
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Could not create event')
        this.saving.set(false)
      },
    })
  }
}
