// API response/request models (English, aligned with the generic backend).
// Fields are snake_case to match the backend JSON.

export type Json = Record<string, unknown>

export interface User {
  id: number
  first_name: string | null
  last_name: string | null
  email: string
  login: string
  role: string
  created_at: string
  updated_at: string
}

export interface EventType {
  id: number
  key: string
  label: string
  config: Json
}

export interface EventModel {
  id: number
  event_type_id: number
  name: string
  slug: string | null
  description: string | null
  venue: string | null
  timezone: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  is_current: boolean
  settings: Json
  created_at: string
  updated_at: string
}

export interface Area {
  id: number
  event_id: number
  name: string
  kind: string
  capacity: number | null
  layout: Json
}

export interface ResourceType {
  id: number
  event_id: number | null
  key: string
  label: string
  unit: string
  attributes: Json
}

export interface ResourceModel {
  id: number
  event_id: number
  area_id: number | null
  resource_type_id: number
  label: string | null
  total_quantity: number
  attributes: Json
}

export interface PricingTier {
  id: number
  event_id: number
  name: string
  resource_type_id: number | null
  area_id: number | null
  unit_price: string
  price_per_sqm: string | null
  attributes: Json
}

export interface ParticipantContact {
  id: number
  participant_id: number
  name: string
  email: string | null
  phone: string | null
  role: string | null
}

export interface Participant {
  id: number
  event_id: number
  participant_type: string
  name: string
  external_ref: string | null
  attributes: Json
  contacts?: ParticipantContact[]
}

export interface PipelineStage {
  id: number
  key: string
  label: string
  position: number
  is_terminal: boolean
}

export interface BookedResource {
  id: number
  booking_id: number
  resource_type_id: number
  area_id: number | null
  quantity: number
  unit_price: string
}

export interface BookingItem {
  id: number
  booking_id: number
  item_type: string
  item_ref: number | null
  area_id: number | null
  quantity: number
}

export interface Booking {
  id: number
  event_id: number
  participant_id: number
  stage_id: number | null
  attendance_status: string
  notes: string | null
  discount_amount: string
  attributes: Json
  // present in list responses
  participant_name?: string
  stage_key?: string | null
  stage_label?: string | null
  invoice_status?: string
  // present in detail responses
  resources?: BookedResource[]
  items?: BookingItem[]
}

export interface InvoiceLine {
  id: number
  invoice_id: number
  description: string
  quantity: string
  unit_price: string
  line_total: string
}

export interface Invoice {
  id: number
  booking_id: number
  invoice_number: string | null
  status: string
  total_amount: string
  issued_at: string | null
  paid_at: string | null
  lines?: InvoiceLine[]
}

export interface QuoteLine {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Quote {
  booking_id: number
  subtotal: number
  discount: number
  total: number
  lines: QuoteLine[]
}

export interface Publisher {
  id: number
  name: string
  attributes: Json
}

export interface Author {
  id: number
  first_name: string | null
  last_name: string
}

export interface Game {
  id: number
  publisher_id: number | null
  name: string
  category: string | null
  min_age: number | null
  max_age: number | null
  min_players: number | null
  max_players: number | null
  table_size: string | null
  average_duration: number | null
  attributes: Json
  authors?: Author[]
}

export interface EventStats {
  bookings_total: number
  bookings_by_stage: { key: string | null; label: string | null; count: number }[]
  participants_total: number
  resources_capacity: number
  resources_booked: number
  revenue_invoiced: number
  revenue_paid: number
}

// Public showcase
export interface PublicEvent {
  id: number
  name: string
  slug: string | null
  description: string | null
  venue: string | null
  start_date: string | null
  end_date: string | null
  event_type: string
  event_type_label: string
}

export interface PublicEventDetail extends PublicEvent {
  areas: Pick<Area, 'id' | 'name' | 'kind'>[]
  participants: Pick<Participant, 'id' | 'name' | 'participant_type'>[]
  games: Pick<Game, 'id' | 'name' | 'category' | 'min_players' | 'max_players' | 'min_age'>[]
}
