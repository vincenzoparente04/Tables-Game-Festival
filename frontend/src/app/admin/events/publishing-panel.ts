import { Component, effect, inject, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { EventsApi } from '../../core/api'
import { PermissionsService } from '../../core/permissions'
import { Icon } from '../../shared/icon'
import type { EventModel, Json } from '../../core/models'

// Publishing & presentation settings, embedded in the event detail page.
// Publishing auto-generates the public slug server-side when missing.
@Component({
  selector: 'app-publishing-panel',
  imports: [FormsModule, Icon],
  template: `
    <div class="card pad">
      <div class="head">
        <h3>Publishing &amp; details</h3>
        <div class="state">
          <span class="badge" [class]="statusClass()">{{ event().status }}</span>
          @if (event().is_featured) { <span class="badge badge-warning"><app-icon name="star" [size]="12" /> Featured</span> }
        </div>
      </div>

      @if (event().slug && event().status === 'published') {
        <p class="muted slug-line">Public page: <a class="link" [href]="'/' + 'events/' + event().slug" target="_blank">/events/{{ event().slug }}</a></p>
      } @else if (event().status !== 'published') {
        <p class="muted slug-line">Publish the event to make it visible on the public site (a URL slug is generated automatically).</p>
      }

      @if (canUpdate()) {
        <div class="form-grid">
          <div class="field"><label>Status</label>
            <select class="select" [(ngModel)]="form.status">
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div class="field"><label>Subtitle</label>
            <input class="input" [(ngModel)]="form.subtitle" placeholder="One-line tagline for the public page" />
          </div>
          <div class="field"><label>Venue name</label>
            <input class="input" [(ngModel)]="form.venue" placeholder="e.g. Parco Nord" />
          </div>
          <div class="field"><label>Address</label>
            <input class="input" [(ngModel)]="form.location_address" placeholder="Street, city" />
          </div>
          <div class="field"><label>Start date</label>
            <input class="input" type="date" [(ngModel)]="form.start_date" />
          </div>
          <div class="field"><label>End date</label>
            <input class="input" type="date" [(ngModel)]="form.end_date" />
          </div>
          <div class="field"><label>Doors open</label>
            <input class="input" type="time" [(ngModel)]="form.start_time" />
          </div>
          <div class="field"><label>Closes at</label>
            <input class="input" type="time" [(ngModel)]="form.end_time" />
          </div>
          <div class="field"><label>Overall capacity (blank = open event)</label>
            <input class="input" type="number" min="0" [(ngModel)]="form.capacity" />
          </div>
        </div>
        <label class="field"><span>Description</span>
          <textarea class="input" rows="4" [(ngModel)]="form.description" placeholder="Public description of the event"></textarea>
        </label>
        <div class="actions">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save settings' }}</button>
          @if (canFeature() && !event().is_featured) {
            <button class="btn" (click)="setFeatured()"><app-icon name="star" [size]="14" /> Feature on homepage</button>
          }
          @if (error()) { <span class="err">{{ error() }}</span> }
        </div>
      }
    </div>
  `,
  styles: `
    .pad { padding: 20px 22px; }
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .state { display: flex; gap: 8px; }
    .slug-line { margin-bottom: 14px; font-size: 13px; }
    .link { color: var(--primary-600); font-weight: 600; }
    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    .err { color: var(--danger); font-size: 13px; }
  `,
})
export class PublishingPanel {
  readonly event = input.required<EventModel>()
  readonly updated = output<EventModel>()

  private api = inject(EventsApi)
  private perms = inject(PermissionsService)

  readonly saving = signal(false)
  readonly error = signal('')
  readonly canUpdate = this.perms.can('events', 'update')
  readonly canFeature = this.perms.can('events', 'setFeatured')

  form = {
    status: 'draft', subtitle: '', venue: '', location_address: '',
    start_date: '', end_date: '', start_time: '', end_time: '',
    capacity: null as number | null, description: '',
  }

  constructor() {
    effect(() => {
      const e = this.event()
      this.form = {
        status: e.status,
        subtitle: e.subtitle ?? '',
        venue: e.venue ?? '',
        location_address: e.location_address ?? '',
        start_date: e.start_date ?? '',
        end_date: e.end_date ?? '',
        start_time: e.start_time?.slice(0, 5) ?? '',
        end_time: e.end_time?.slice(0, 5) ?? '',
        capacity: e.capacity,
        description: e.description ?? '',
      }
    })
  }

  statusClass() {
    const s = this.event().status
    return s === 'published' ? 'badge-success' : s === 'archived' ? 'badge-danger' : 'badge-warning'
  }

  save() {
    const body: Json = {
      status: this.form.status,
      subtitle: this.form.subtitle.trim() || null,
      location_address: this.form.location_address.trim() || null,
      capacity: this.form.capacity === null || (this.form.capacity as unknown) === '' ? null : Number(this.form.capacity),
      start_time: this.form.start_time || null,
      end_time: this.form.end_time || null,
    }
    if (this.form.venue.trim()) body['venue'] = this.form.venue.trim()
    if (this.form.description.trim()) body['description'] = this.form.description.trim()
    if (this.form.start_date) body['start_date'] = this.form.start_date
    if (this.form.end_date) body['end_date'] = this.form.end_date

    this.saving.set(true)
    this.error.set('')
    this.api.update(this.event().id, body).subscribe({
      next: (e) => { this.saving.set(false); this.updated.emit(e) },
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Could not save settings')
        this.saving.set(false)
      },
    })
  }

  setFeatured() {
    this.api.setFeatured(this.event().id).subscribe((e) => this.updated.emit(e))
  }
}
