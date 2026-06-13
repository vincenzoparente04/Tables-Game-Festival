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
  status: string // draft | published | archived
  is_featured: boolean
  hero_image_url: string | null
  subtitle: string | null
  location_address: string | null
  capacity: number | null
  start_time: string | null
  end_time: string | null
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
  kind: string // exhibitor | artist | vendor | sponsor | other
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
  // present in create responses (duplicate-agreement hints)
  warnings?: string[]
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

// Public visitor site
export interface PublicEvent {
  id: number
  name: string
  slug: string | null
  subtitle: string | null
  description: string | null
  venue: string | null
  location_address: string | null
  timezone: string
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  hero_image_url: string | null
  is_featured: boolean
  capacity: number | null
  event_type: string
  event_type_label: string
}

export interface PublicLineupArtist {
  id: number
  name: string
  kind: string
  bio: string | null
  image_url: string | null
  links: Json
  is_headliner: boolean
}

export interface PublicEventDetail extends PublicEvent {
  areas: Pick<Area, 'id' | 'name' | 'kind'>[]
  lineup: PublicLineupArtist[]
  images: { url: string; alt: string | null; kind: string }[]
}

export interface PublicTicketType {
  id: number
  name: string
  description: string | null
  price: string
  currency: string
  capacity: number | null
  max_per_order: number
  position: number
  sales_start_at: string | null
  sales_end_at: string | null
  available: number | null // null = unlimited
}

export interface PublicScheduleSlot {
  id: number
  title: string
  kind: string
  starts_at: string
  ends_at: string
  area_name: string | null
  artist_name: string | null
  artist_image_url: string | null
}

export interface PublicMapElement {
  id: number
  kind: string
  label: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  capacity: number | null
  color: string | null
  z_index: number
}

export interface PublicVenueMap {
  id: number
  name: string
  width: number
  height: number
  background: Json[]
  elements: PublicMapElement[]
}

export interface PublicOrderResult {
  order: Order
  tickets: Ticket[]
  checkout_url?: string
}

export interface PublicOrderView {
  order: Order
  tickets: Ticket[]
  event: {
    id: number
    name: string
    slug: string | null
    venue: string | null
    location_address: string | null
    hero_image_url: string | null
    start_date: string | null
    end_date: string | null
    start_time: string | null
  }
}

// --- Arts domain (Phase D1) ---

export interface Artist {
  id: number
  name: string
  kind: string
  bio: string | null
  image_url: string | null
  links: Json
  attributes: Json
}

export interface EventArtist {
  id: number
  event_id: number
  artist_id: number
  booking_id: number | null
  is_headliner: boolean
  display_order: number
  // present in list responses
  artist_name?: string
  artist_kind?: string
  artist_image_url?: string | null
}

export interface ScheduleSlot {
  id: number
  event_id: number
  area_id: number | null
  artist_id: number | null
  booking_id: number | null
  title: string
  kind: string
  starts_at: string
  ends_at: string
  status: string // tentative | confirmed | cancelled
  is_public: boolean
  // present in list responses
  area_name?: string | null
  artist_name?: string | null
  // present in create/update responses
  warnings?: string[]
}

export interface Expense {
  id: number
  event_id: number
  booking_id: number | null
  participant_id: number | null
  category: string
  description: string
  amount: string
  status: string // planned | committed | paid
  due_date: string | null
  paid_at: string | null
  supplier_invoice_ref: string | null
  attachment_url: string | null
  participant_name?: string | null
}

export interface EventFinance {
  event_id: number
  income: { invoiced: number; paid: number }
  expenses: { planned: number; committed: number; paid: number; total: number }
  expenses_by_category: { category: string; total: number; paid: number }[]
  net_projected: number
  net_paid: number
}

export interface UploadedImage {
  url: string
  public_id: string
  width: number
  height: number
}

export interface EventImage {
  id: number
  event_id: number
  url: string
  public_id: string | null
  kind: string // gallery | poster
  position: number
  alt: string | null
}

// --- Venue maps (Phase D2) ---

export interface MapElement {
  id: number
  venue_map_id: number
  kind: string
  label: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  capacity: number | null
  color: string | null
  z_index: number
  area_id: number | null
  resource_id: number | null
  booking_id: number | null
  attributes: Json
  // present in detail responses
  area_name?: string | null
  resource_label?: string | null
  booking_participant_name?: string | null
}

export interface CapacitySummary {
  total: number
  by_kind: { kind: string; count: number; capacity: number }[]
}

export interface VenueMap {
  id: number
  event_id: number
  name: string
  template_key: string | null
  width: number
  height: number
  background: Json[]
  settings: Json
  is_public: boolean
  // present in detail responses
  elements?: MapElement[]
  capacity_summary?: CapacitySummary
}

export interface VenueTemplate {
  key: string
  label: string
  category: string
  description: string
  canvas: { width: number; height: number }
  background: Json[]
}

// --- Ticketing (Phase D3) ---

export interface TicketType {
  id: number
  event_id: number
  name: string
  description: string | null
  price: string
  currency: string
  capacity: number | null
  sales_start_at: string | null
  sales_end_at: string | null
  max_per_order: number
  status: string // hidden | on_sale | paused
  position: number
  sold?: number
}

export interface Ticket {
  id: number
  order_id: number
  ticket_type_id: number
  code: string
  attendee_name: string | null
  status: string // valid | checked_in | cancelled
  checked_in_at: string | null
  ticket_type_name?: string
}

export interface Order {
  id: number
  event_id: number
  code: string
  customer_name: string
  customer_email: string
  status: string // pending | confirmed | cancelled | expired | refunded
  total_amount: string
  currency: string
  payment_provider: string
  expires_at: string | null
  confirmed_at: string | null
  created_at: string
  tickets_count?: number
  tickets?: Ticket[]
}

export interface CheckInResult {
  ticket: Ticket
  ticket_type_name: string
  order_code: string
  customer_name: string
  event_id: number
}
