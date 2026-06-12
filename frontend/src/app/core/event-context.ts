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

  // Refetch events on each page entry: keeps the list fresh (new/current events)
  // while preserving a still-valid selection, otherwise defaults to the current event.
  ensureLoaded() {
    this.api.list().subscribe((list) => {
      this.events.set(list)
      const sel = this.selectedId()
      if (sel == null || !list.some((e) => e.id === sel)) {
        const current = list.find((e) => e.is_current) ?? list[0]
        this.selectedId.set(current?.id ?? null)
      }
    })
  }

  select(id: number) {
    this.selectedId.set(id)
  }

  // Called after marking an event current, so management pages follow it.
  syncCurrent(id: number) {
    this.selectedId.set(id)
    this.ensureLoaded()
  }
}
