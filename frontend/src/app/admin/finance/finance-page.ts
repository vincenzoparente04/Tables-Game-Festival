import { Component, OnInit, computed, effect, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { EventsApi } from '../../core/api'
import { EventContext } from '../../core/event-context'
import { EventSelector } from '../../shared/event-selector'
import type { EventFinance } from '../../core/models'

// Event finance overview: money IN (invoices to participants) vs money OUT
// (expenses), with a per-category breakdown.
@Component({
  selector: 'app-finance-page',
  imports: [RouterLink, EventSelector],
  template: `
    <div class="page-head">
      <div><h1>Finance</h1><p class="muted">Income vs expenses for the selected event.</p></div>
    </div>
    <div class="toolbar">
      <app-event-selector />
      <span class="spacer"></span>
      <a class="btn" routerLink="/admin/expenses">Manage expenses →</a>
    </div>

    @if (!ctx.selectedId()) {
      <div class="card empty">Select or create an event first.</div>
    } @else if (loading()) {
      <div class="card empty">Loading…</div>
    } @else if (finance(); as f) {
      <div class="kpis">
        <div class="card kpi">
          <div class="muted">Income invoiced</div>
          <div class="val in">€{{ f.income.invoiced.toFixed(2) }}</div>
          <div class="muted sub">€{{ f.income.paid.toFixed(2) }} collected</div>
        </div>
        <div class="card kpi">
          <div class="muted">Expenses tracked</div>
          <div class="val out">€{{ f.expenses.total.toFixed(2) }}</div>
          <div class="muted sub">€{{ f.expenses.paid.toFixed(2) }} paid out</div>
        </div>
        <div class="card kpi">
          <div class="muted">Net (projected)</div>
          <div class="val" [class.neg]="f.net_projected < 0" [class.pos]="f.net_projected >= 0">€{{ f.net_projected.toFixed(2) }}</div>
          <div class="muted sub">invoiced − all expenses</div>
        </div>
        <div class="card kpi">
          <div class="muted">Net (cash)</div>
          <div class="val" [class.neg]="f.net_paid < 0" [class.pos]="f.net_paid >= 0">€{{ f.net_paid.toFixed(2) }}</div>
          <div class="muted sub">collected − paid out</div>
        </div>
      </div>

      <div class="card pad">
        <h3>Expense pipeline</h3>
        <div class="pipeline">
          <span class="chip">Planned <strong>€{{ f.expenses.planned.toFixed(2) }}</strong></span>
          <span class="chip">Committed <strong>€{{ f.expenses.committed.toFixed(2) }}</strong></span>
          <span class="chip paid">Paid <strong>€{{ f.expenses.paid.toFixed(2) }}</strong></span>
        </div>
      </div>

      <div class="card pad">
        <h3>Expenses by category</h3>
        @if (f.expenses_by_category.length === 0) {
          <div class="muted bars-empty">No expenses tracked yet.</div>
        }
        <div class="bars">
          @for (c of f.expenses_by_category; track c.category) {
            <div class="bar-row">
              <span class="bar-label">{{ c.category }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="barWidth(c.total)">
                  <div class="bar-paid" [style.width.%]="c.total > 0 ? (c.paid / c.total) * 100 : 0"></div>
                </div>
              </div>
              <span class="bar-val">€{{ c.total.toFixed(2) }} <span class="muted">({{ c.paid.toFixed(2) }} paid)</span></span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .kpi { padding: 18px 20px; }
    .kpi .val { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .kpi .val.in { color: var(--success); }
    .kpi .val.out { color: var(--danger); }
    .kpi .val.pos { color: var(--success); }
    .kpi .val.neg { color: var(--danger); }
    .kpi .sub { font-size: 13px; margin-top: 4px; }
    .pad { padding: 20px 22px; margin-bottom: 16px; }
    .pipeline { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
    .chip { background: var(--surface-2); border-radius: 999px; padding: 6px 14px; font-size: 13px; color: var(--text-muted); }
    .chip strong { color: var(--text); margin-left: 4px; }
    .chip.paid strong { color: var(--success); }
    .bars { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .bars-empty { margin-top: 10px; }
    .bar-row { display: grid; grid-template-columns: 130px 1fr 200px; align-items: center; gap: 12px; }
    .bar-label { font-size: 13px; font-weight: 600; }
    .bar-track { background: var(--surface-2); border-radius: 6px; height: 18px; overflow: hidden; }
    .bar-fill { background: var(--primary-50); border: 1px solid var(--primary); border-radius: 6px; height: 100%; min-width: 2%; overflow: hidden; }
    .bar-paid { background: var(--primary); height: 100%; }
    .bar-val { font-size: 13px; text-align: right; }
    @media (max-width: 720px) { .bar-row { grid-template-columns: 90px 1fr; } .bar-val { grid-column: 1 / -1; text-align: left; } }
  `,
})
export class FinancePage implements OnInit {
  readonly ctx = inject(EventContext)
  private eventsApi = inject(EventsApi)

  readonly finance = signal<EventFinance | null>(null)
  readonly loading = signal(false)

  private readonly maxCategory = computed(() =>
    Math.max(1, ...(this.finance()?.expenses_by_category.map((c) => c.total) ?? [1])),
  )

  constructor() {
    effect(() => {
      const id = this.ctx.selectedId()
      if (id != null) this.load(id)
    })
  }

  ngOnInit() { this.ctx.ensureLoaded() }

  private load(eventId: number) {
    this.loading.set(true)
    this.eventsApi.finance(eventId).subscribe({
      next: (f) => { this.finance.set(f); this.loading.set(false) },
      error: () => this.loading.set(false),
    })
  }

  barWidth(total: number): number {
    return Math.max(2, (total / this.maxCategory()) * 100)
  }
}
