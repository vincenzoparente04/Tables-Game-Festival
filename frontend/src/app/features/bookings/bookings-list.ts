import { Component, OnInit, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { BookingsApi, EventsApi, ParticipantsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import type { Booking, Participant, PipelineStage } from '../../core/models'

@Component({
  selector: 'app-bookings-list',
  imports: [FormsModule, RouterLink, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Bookings</h1><p class="muted">Reservations and their commercial status.</p></div>
    </div>
    <div class="toolbar">
      <app-event-selector />
      <span class="spacer"></span>
      @if (canCreate() && ctx.selectedId()) {
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New booking' }}</button>
      }
    </div>

    @if (showForm()) {
      <div class="card pad addf">
        <div class="form-grid">
          <div class="field"><label>Participant</label>
            <select class="select" name="bp" [(ngModel)]="form.participant_id">
              <option [ngValue]="null" disabled>Select…</option>
              @for (p of participants(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
            </select>
          </div>
          <div class="field"><label>Stage</label>
            <select class="select" name="bs" [(ngModel)]="form.stage_id">
              <option [ngValue]="null">—</option>
              @for (s of stages(); track s.id) { <option [ngValue]="s.id">{{ s.label }}</option> }
            </select>
          </div>
        </div>
        <button class="btn btn-primary" (click)="create()" [disabled]="!form.participant_id || saving()">Create booking</button>
      </div>
    }

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Participant</th><th>Stage</th><th>Invoice</th><th></th></tr></thead>
          <tbody>
            @for (b of bookings(); track b.id) {
              <tr>
                <td><strong>{{ b.participant_name }}</strong></td>
                <td>@if (b.stage_label) { <span class="badge badge-primary">{{ b.stage_label }}</span> } @else { <span class="muted">—</span> }</td>
                <td><span class="badge" [class]="invClass(b.invoice_status)">{{ b.invoice_status }}</span></td>
                <td><div class="actions">
                  <a class="btn btn-sm" [routerLink]="['/admin/bookings', b.id]">Open</a>
                  @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(b.id)">Delete</button> }
                </div></td>
              </tr>
            } @empty { <tr><td colspan="4" class="empty">No bookings yet.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `.addf { margin-bottom: 16px; }`,
})
export class BookingsList implements OnInit {
  readonly ctx = inject(EventContext)
  private api = inject(BookingsApi)
  private participantsApi = inject(ParticipantsApi)
  private eventsApi = inject(EventsApi)
  private perms = inject(PermissionsService)

  readonly bookings = signal<Booking[]>([])
  readonly participants = signal<Participant[]>([])
  readonly stages = signal<PipelineStage[]>([])
  readonly loading = signal(false)
  readonly showForm = signal(false)
  readonly saving = signal(false)
  form = { participant_id: null as number | null, stage_id: null as number | null }

  readonly canCreate = this.perms.can('bookings', 'create')
  readonly canDelete = this.perms.can('bookings', 'delete')

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private load(eventId: number) {
    this.loading.set(true)
    this.api.list(eventId).subscribe((b) => { this.bookings.set(b); this.loading.set(false) })
    this.participantsApi.list(eventId).subscribe((p) => this.participants.set(p))
    this.eventsApi.pipeline(eventId).subscribe((s) => this.stages.set(s))
  }

  invClass(status?: string) {
    return status === 'paid' ? 'badge-success'
      : status === 'issued' ? 'badge-primary'
      : status === 'draft' ? 'badge-warning' : ''
  }

  create() {
    const eventId = this.ctx.selectedId()
    if (!eventId || !this.form.participant_id) return
    this.saving.set(true)
    const body: Record<string, unknown> = { event_id: eventId, participant_id: this.form.participant_id }
    if (this.form.stage_id) body['stage_id'] = this.form.stage_id
    this.api.create(body).subscribe({
      next: () => { this.form = { participant_id: null, stage_id: null }; this.saving.set(false); this.showForm.set(false); this.load(eventId) },
      error: () => this.saving.set(false),
    })
  }

  remove(id: number) {
    const eventId = this.ctx.selectedId()
    if (confirm('Delete this booking?')) this.api.remove(id).subscribe(() => eventId && this.load(eventId))
  }
}
