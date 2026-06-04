import { findById, listAll } from './crud.js'

export interface EventTypeRow {
  id: number
  key: string
  label: string
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export const listEventTypes = () => listAll<EventTypeRow>('event_types', 'label')
export const getEventType = (id: number) => findById<EventTypeRow>('event_types', id)
