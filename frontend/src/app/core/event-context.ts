import { Injectable, computed, inject, signal } from '@angular/core'
import { EventsApi } from './api'
import type { EventModel } from './models'

// Shared "which event am I managing" state for event-scoped pages
// (participants, bookings, resources, invoices). Defaults to the current event.
@Injectable({ providedIn: 'root' })
export class EventContext {
  private api = inject(EventsApi)
  readonly events = signal<EventModel[]>([])
  readonly selectedId = signal<number | null>(null)
  readonly selected = computed(() => this.events().find((e) => e.id === this.selectedId()) ?? null)
  private loading = false

  ensureLoaded() {
    if (this.loading || this.events().length) return
    this.loading = true
    this.api.list().subscribe((list) => {
      this.events.set(list)
      if (this.selectedId() == null) {
        const current = list.find((e) => e.is_current) ?? list[0]
        this.selectedId.set(current?.id ?? null)
      }
    })
  }

  select(id: number) {
    this.selectedId.set(id)
  }
}
