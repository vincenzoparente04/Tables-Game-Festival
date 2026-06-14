import { Component, OnInit, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ExpensesApi, ParticipantsApi, UploadsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import { expenseStatusColor } from '../../shared/status-colors'
import type { Expense, Json, Participant } from '../../core/models'

const CATEGORIES = [
  'artist_fee', 'technicians', 'security', 'catering', 'bar_supplies',
  'rental', 'marketing', 'logistics', 'cleaning', 'insurance', 'other',
]
const STATUSES = ['planned', 'committed', 'paid'] as const

// Money OUT: supplier/artist payments and self-managed purchases
// (e.g. running your own bar). Money IN lives in Invoices.
@Component({
  selector: 'app-expenses-page',
  imports: [FormsModule, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Expenses</h1><p class="muted">Supplier payments and self-managed purchases.</p></div>
    </div>
    <div class="toolbar">
      <app-event-selector />
      <select class="select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
        <option value="">All statuses</option>
        @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
      </select>
      <span class="spacer"></span>
      @if (canCreate() && ctx.selectedId()) {
        <button class="btn btn-primary" (click)="showForm.set(!showForm())">{{ showForm() ? 'Cancel' : '+ New expense' }}</button>
      }
    </div>

    @if (ctx.selectedId()) {
      <div class="chips">
        <span class="chip">Planned <strong>€{{ totalOf('planned') }}</strong></span>
        <span class="chip">Committed <strong>€{{ totalOf('committed') }}</strong></span>
        <span class="chip paid">Paid <strong>€{{ totalOf('paid') }}</strong></span>
      </div>
    }

    @if (showForm()) {
      <div class="card pad addf">
        <div class="form-grid">
          <div class="field"><label>Description *</label>
            <input class="input" [(ngModel)]="form.description" placeholder="e.g. Night security shift" />
          </div>
          <div class="field"><label>Category</label>
            <input class="input" [(ngModel)]="form.category" list="exp-cats" placeholder="other" />
            <datalist id="exp-cats">@for (c of categories; track c) { <option [value]="c"></option> }</datalist>
          </div>
          <div class="field"><label>Amount (€) *</label>
            <input class="input" type="number" min="0" step="0.01" [(ngModel)]="form.amount" />
          </div>
          <div class="field"><label>Status</label>
            <select class="select" [(ngModel)]="form.status">
              @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
            </select>
          </div>
          <div class="field"><label>Due date</label>
            <input class="input" type="date" [(ngModel)]="form.due_date" />
          </div>
          <div class="field"><label>Supplier (participant)</label>
            <select class="select" [(ngModel)]="form.participant_id">
              <option [ngValue]="null">—</option>
              @for (p of participants(); track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
            </select>
          </div>
          <div class="field"><label>Supplier invoice ref</label>
            <input class="input" [(ngModel)]="form.supplier_invoice_ref" placeholder="e.g. INV-2026-042" />
          </div>
          <div class="field"><label>Receipt</label>
            <div class="receipt-row">
              <label class="btn btn-sm">
                {{ uploading() ? 'Uploading…' : (form.attachment_url ? 'Replace' : 'Upload') }}
                <input type="file" accept="image/*" hidden (change)="onFile($event)" [disabled]="uploading()" />
              </label>
              @if (form.attachment_url) { <a class="link" [href]="form.attachment_url" target="_blank" rel="noopener">view</a> }
            </div>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" (click)="save()" [disabled]="saving() || !form.description.trim() || form.amount === null">
            {{ saving() ? 'Saving…' : 'Save expense' }}
          </button>
          @if (error()) { <span class="err">{{ error() }}</span> }
        </div>
      </div>
    }

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Description</th><th>Category</th><th>Supplier</th><th>Amount</th><th>Status</th><th>Due</th><th></th></tr></thead>
          <tbody>
            @for (e of filtered(); track e.id) {
              <tr>
                <td>
                  <strong class="dname">{{ e.description }}</strong>
                  @if (e.attachment_url) { <a class="link sm" [href]="e.attachment_url" target="_blank" rel="noopener">receipt</a> }
                </td>
                <td><span class="badge ccol">{{ e.category }}</span></td>
                <td>{{ e.participant_name || '—' }}</td>
                <td><strong>€{{ e.amount }}</strong></td>
                <td><span class="badge scol" [style.color]="expenseStatusColor(e.status)">{{ e.status }}</span></td>
                <td class="muted">{{ e.due_date || '—' }}</td>
                <td><div class="actions">
                  @if (canUpdate() && e.status !== 'paid') {
                    <button class="btn btn-sm" (click)="markPaid(e)">Mark paid</button>
                  }
                  @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(e)">Delete</button> }
                </div></td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">No expenses tracked yet.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .addf { margin-bottom: 16px; }
    .dname { font-family: var(--font-display); letter-spacing: -0.01em; }
    .ccol, .scol { font-family: var(--font-mono); }
    .chips { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .chip { background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; font-size: 13px; color: var(--text-muted); }
    .chip strong { color: var(--text); margin-left: 4px; }
    .chip.paid strong { color: var(--success); }
    .receipt-row { display: flex; align-items: center; gap: 10px; }
    .link { color: var(--primary-600); font-weight: 600; }
    .link.sm { font-size: 12px; margin-left: 8px; }
    .actions { display: flex; gap: 6px; }
    .err { color: var(--danger); font-size: 13px; margin-left: 10px; }
  `,
})
export class ExpensesPage implements OnInit {
  readonly ctx = inject(EventContext)
  private api = inject(ExpensesApi)
  private participantsApi = inject(ParticipantsApi)
  private uploads = inject(UploadsApi)
  private perms = inject(PermissionsService)

  readonly categories = CATEGORIES
  readonly statuses = STATUSES
  readonly expenseStatusColor = expenseStatusColor
  readonly expenses = signal<Expense[]>([])
  readonly participants = signal<Participant[]>([])
  readonly loading = signal(false)
  readonly showForm = signal(false)
  readonly saving = signal(false)
  readonly uploading = signal(false)
  readonly error = signal('')
  readonly statusFilter = signal('')

  form = {
    description: '', category: '', amount: null as number | null, status: 'planned',
    due_date: '', participant_id: null as number | null, supplier_invoice_ref: '', attachment_url: '',
  }

  readonly canCreate = this.perms.can('expenses', 'create')
  readonly canUpdate = this.perms.can('expenses', 'update')
  readonly canDelete = this.perms.can('expenses', 'delete')

  readonly filtered = computed(() => {
    const status = this.statusFilter()
    return status ? this.expenses().filter((e) => e.status === status) : this.expenses()
  })

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private load(eventId: number) {
    this.loading.set(true)
    this.api.list({ event_id: eventId }).subscribe((e) => { this.expenses.set(e); this.loading.set(false) })
    this.participantsApi.list(eventId).subscribe((p) => this.participants.set(p))
  }

  totalOf(status: string): string {
    const sum = this.expenses()
      .filter((e) => e.status === status)
      .reduce((acc, e) => acc + Number(e.amount), 0)
    return sum.toFixed(2)
  }

  onFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.uploading.set(true)
    this.uploads.upload(file, this.ctx.selectedId() ?? undefined).subscribe({
      next: (img) => { this.form.attachment_url = img.url; this.uploading.set(false) },
      error: (e) => { this.error.set(e?.error?.error ?? 'Upload failed'); this.uploading.set(false) },
    })
  }

  save() {
    const eventId = this.ctx.selectedId()
    if (!eventId || !this.form.description.trim() || this.form.amount === null) return
    const body: Json = {
      event_id: eventId,
      description: this.form.description.trim(),
      amount: Number(this.form.amount),
      status: this.form.status,
    }
    if (this.form.category.trim()) body['category'] = this.form.category.trim()
    if (this.form.due_date) body['due_date'] = this.form.due_date
    if (this.form.participant_id) body['participant_id'] = this.form.participant_id
    if (this.form.supplier_invoice_ref.trim()) body['supplier_invoice_ref'] = this.form.supplier_invoice_ref.trim()
    if (this.form.attachment_url) body['attachment_url'] = this.form.attachment_url

    this.saving.set(true)
    this.error.set('')
    this.api.create(body).subscribe({
      next: () => {
        this.form = {
          description: '', category: '', amount: null, status: 'planned',
          due_date: '', participant_id: null, supplier_invoice_ref: '', attachment_url: '',
        }
        this.saving.set(false)
        this.showForm.set(false)
        this.load(eventId)
      },
      error: (e) => {
        this.error.set(e?.error?.error ?? 'Could not save expense')
        this.saving.set(false)
      },
    })
  }

  markPaid(e: Expense) {
    this.api.update(e.id, { status: 'paid' }).subscribe(() => {
      const id = this.ctx.selectedId()
      if (id) this.load(id)
    })
  }

  remove(e: Expense) {
    if (confirm(`Delete expense "${e.description}"?`)) {
      this.api.remove(e.id).subscribe(() => {
        const id = this.ctx.selectedId()
        if (id) this.load(id)
      })
    }
  }
}
