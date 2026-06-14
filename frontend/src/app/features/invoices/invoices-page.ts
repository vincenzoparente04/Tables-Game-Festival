import { Component, OnInit, effect, inject, signal } from '@angular/core'
import { SlicePipe } from '@angular/common'
import { InvoicesApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { PermissionsService } from '../../core/permissions'
import { EventSelector } from '../../shared/event-selector'
import { invoiceStatusColor } from '../../shared/status-colors'
import type { Invoice } from '../../core/models'

@Component({
  selector: 'app-invoices-page',
  imports: [EventSelector, SlicePipe],
  template: `
    <div class="page-head">
      <div><h1>Invoices</h1><p class="muted">Generated from bookings. Track issuing and payment.</p></div>
    </div>
    <div class="toolbar"><app-event-selector /></div>

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else {
      <div class="card">
        <table class="table">
          <thead><tr><th>Number</th><th>Status</th><th>Amount</th><th>Issued</th><th></th></tr></thead>
          <tbody>
            @for (i of invoices(); track i.id) {
              <tr>
                <td><strong>{{ i.invoice_number || '—' }}</strong></td>
                <td><span class="badge scol" [style.color]="invoiceStatusColor(i.status)">{{ i.status }}</span></td>
                <td>€{{ i.total_amount }}</td>
                <td class="muted">{{ i.issued_at ? (i.issued_at | slice: 0 : 10) : '—' }}</td>
                <td><div class="actions">
                  @if (canMarkPaid() && i.status !== 'paid') { <button class="btn btn-sm btn-primary" (click)="markPaid(i.id)">Mark paid</button> }
                  @if (canDelete()) { <button class="btn btn-sm btn-danger" (click)="remove(i.id)">Delete</button> }
                </div></td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">No invoices yet. Generate them from a booking.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `.scol { font-family: var(--font-mono); }`,
})
export class InvoicesPage implements OnInit {
  readonly ctx = inject(EventContext)
  private api = inject(InvoicesApi)
  private perms = inject(PermissionsService)

  readonly invoices = signal<Invoice[]>([])
  readonly invoiceStatusColor = invoiceStatusColor
  readonly loading = signal(false)
  readonly canMarkPaid = this.perms.can('invoices', 'markPaid')
  readonly canDelete = this.perms.can('invoices', 'delete')

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private load(eventId: number) {
    this.loading.set(true)
    this.api.list({ event_id: eventId }).subscribe((i) => { this.invoices.set(i); this.loading.set(false) })
  }

  markPaid(id: number) {
    const e = this.ctx.selectedId()
    this.api.markPaid(id).subscribe(() => e && this.load(e))
  }

  remove(id: number) {
    const e = this.ctx.selectedId()
    if (confirm('Delete this invoice?')) this.api.remove(id).subscribe(() => e && this.load(e))
  }
}
