import { Component, OnInit, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ParticipantsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import { participantTypeColor } from '../../shared/status-colors'
import type { Participant } from '../../core/models'

const TYPES = ['exhibitor', 'vendor', 'performer', 'attendee', 'sponsor', 'provider', 'association', 'other']

@Component({
  selector: 'app-participants-list',
  imports: [FormsModule, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Participants</h1><p class="muted">Exhibitors, vendors, performers and more.</p></div>
    </div>

    <div class="toolbar">
      <app-event-selector />
      <span class="spacer"></span>
      @if (canCreate() && ctx.selectedId()) {
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ Add participant' }}</button>
      }
    </div>

    @if (showForm()) {
      <div class="card pad addf">
        <div class="form-grid">
          <div class="field"><label>Name</label><input class="input" name="pn" [(ngModel)]="form.name" /></div>
          <div class="field"><label>Type</label>
            <select class="select" name="pt" [(ngModel)]="form.participant_type">
              @for (t of types; track t) { <option [value]="t">{{ t }}</option> }
            </select>
          </div>
        </div>
        <button class="btn btn-primary" (click)="add()" [disabled]="!form.name.trim() || saving()">Save participant</button>
      </div>
    }

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Name</th><th>Type</th><th>Reference</th><th></th></tr></thead>
          <tbody>
            @for (p of participants(); track p.id) {
              <tr>
                <td><strong class="pname">{{ p.name }}</strong></td>
                <td><span class="badge ptype" [style.color]="typeColor(p.participant_type)">{{ p.participant_type }}</span></td>
                <td class="muted">{{ p.external_ref || '—' }}</td>
                <td><div class="actions">
                  @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(p.id)">Delete</button> }
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="empty">No participants yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .addf { margin-bottom: 16px; }
    .pname { font-family: var(--font-display); letter-spacing: -0.01em; }
    .ptype { font-family: var(--font-mono); }
  `,
})
export class ParticipantsList implements OnInit {
  readonly ctx = inject(EventContext)
  private api = inject(ParticipantsApi)
  private perms = inject(PermissionsService)

  readonly types = TYPES
  readonly typeColor = participantTypeColor
  readonly participants = signal<Participant[]>([])
  readonly loading = signal(false)
  readonly showForm = signal(false)
  readonly saving = signal(false)
  form = { name: '', participant_type: 'exhibitor' }

  readonly canCreate = this.perms.can('participants', 'create')
  readonly canDelete = this.perms.can('participants', 'delete')

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() {
    this.ctx.ensureLoaded()
  }

  private load(eventId: number) {
    this.loading.set(true)
    this.api.list(eventId).subscribe((p) => {
      this.participants.set(p)
      this.loading.set(false)
    })
  }

  add() {
    const eventId = this.ctx.selectedId()
    if (!eventId || !this.form.name.trim()) return
    this.saving.set(true)
    this.api
      .create({ event_id: eventId, name: this.form.name.trim(), participant_type: this.form.participant_type })
      .subscribe({
        next: () => {
          this.form.name = ''
          this.saving.set(false)
          this.showForm.set(false)
          this.load(eventId)
        },
        error: () => this.saving.set(false),
      })
  }

  remove(participantId: number) {
    const eventId = this.ctx.selectedId()
    if (confirm('Delete this participant?')) {
      this.api.remove(participantId).subscribe(() => eventId && this.load(eventId))
    }
  }
}
