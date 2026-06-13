import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../environments/environment'
import type {
  Area, Artist, Author, Booking, BookingItem, BookedResource, CheckInResult, EventArtist,
  EventFinance, EventImage, EventModel, EventStats, EventType, Expense, Game, Invoice, Json,
  Order, Participant, ParticipantContact, PipelineStage, PricingTier, PublicEvent,
  PublicEventDetail, PublicOrderResult, PublicOrderView, PublicScheduleSlot, PublicTicketType,
  PublicVenueMap, Publisher, Quote, ResourceModel, ResourceType, ScheduleSlot, TicketType,
  UploadedImage, User, VenueMap, VenueTemplate,
} from './models'

const API = environment.apiUrl
const evt = (eventId?: number) => (eventId ? `?event_id=${eventId}` : '')

@Injectable({ providedIn: 'root' })
export class EventsApi {
  private http = inject(HttpClient)
  private base = `${API}/events`
  list() { return this.http.get<EventModel[]>(this.base) }
  current() { return this.http.get<EventModel | null>(`${this.base}/current`) }
  get(id: number) { return this.http.get<EventModel>(`${this.base}/${id}`) }
  stats(id: number) { return this.http.get<EventStats>(`${this.base}/${id}/stats`) }
  pipeline(id: number) { return this.http.get<PipelineStage[]>(`${this.base}/${id}/pipeline`) }
  create(body: Json) { return this.http.post<EventModel>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<EventModel>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
  setCurrent(id: number) { return this.http.patch<EventModel>(`${this.base}/${id}/set-current`, {}) }
  setFeatured(id: number) { return this.http.patch<EventModel>(`${this.base}/${id}/set-featured`, {}) }
  finance(id: number) { return this.http.get<EventFinance>(`${this.base}/${id}/finance`) }
}

@Injectable({ providedIn: 'root' })
export class EventTypesApi {
  private http = inject(HttpClient)
  list() { return this.http.get<EventType[]>(`${API}/event-types`) }
}

@Injectable({ providedIn: 'root' })
export class AreasApi {
  private http = inject(HttpClient)
  private base = `${API}/areas`
  list(eventId?: number) { return this.http.get<Area[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<Area>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Area>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class ResourceTypesApi {
  private http = inject(HttpClient)
  private base = `${API}/resource-types`
  list(eventId?: number) { return this.http.get<ResourceType[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<ResourceType>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<ResourceType>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class ResourcesApi {
  private http = inject(HttpClient)
  private base = `${API}/resources`
  list(eventId?: number) { return this.http.get<ResourceModel[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<ResourceModel>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<ResourceModel>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class PricingTiersApi {
  private http = inject(HttpClient)
  private base = `${API}/pricing-tiers`
  list(eventId?: number) { return this.http.get<PricingTier[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<PricingTier>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<PricingTier>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class ParticipantsApi {
  private http = inject(HttpClient)
  private base = `${API}/participants`
  list(eventId?: number) { return this.http.get<Participant[]>(this.base + evt(eventId)) }
  get(id: number) { return this.http.get<Participant>(`${this.base}/${id}`) }
  create(body: Json) { return this.http.post<Participant>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Participant>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
  addContact(id: number, body: Json) { return this.http.post<ParticipantContact>(`${this.base}/${id}/contacts`, body) }
  removeContact(id: number, contactId: number) { return this.http.delete(`${this.base}/${id}/contacts/${contactId}`) }
}

@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private http = inject(HttpClient)
  private base = `${API}/bookings`
  list(eventId?: number) { return this.http.get<Booking[]>(this.base + evt(eventId)) }
  get(id: number) { return this.http.get<Booking>(`${this.base}/${id}`) }
  create(body: Json) { return this.http.post<Booking>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Booking>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
  addResource(id: number, body: Json) { return this.http.post<BookedResource>(`${this.base}/${id}/resources`, body) }
  removeResource(id: number, resourceId: number) { return this.http.delete(`${this.base}/${id}/resources/${resourceId}`) }
  addItem(id: number, body: Json) { return this.http.post<BookingItem>(`${this.base}/${id}/items`, body) }
  removeItem(id: number, itemId: number) { return this.http.delete(`${this.base}/${id}/items/${itemId}`) }
}

@Injectable({ providedIn: 'root' })
export class InvoicesApi {
  private http = inject(HttpClient)
  private base = `${API}/invoices`
  list(params: { event_id?: number; booking_id?: number } = {}) {
    const q = new URLSearchParams()
    if (params.event_id) q.set('event_id', String(params.event_id))
    if (params.booking_id) q.set('booking_id', String(params.booking_id))
    const qs = q.toString()
    return this.http.get<Invoice[]>(qs ? `${this.base}?${qs}` : this.base)
  }
  get(id: number) { return this.http.get<Invoice>(`${this.base}/${id}`) }
  preview(bookingId: number) { return this.http.get<Quote>(`${this.base}/preview/${bookingId}`) }
  generate(bookingId: number) { return this.http.post<Invoice>(`${this.base}/generate`, { booking_id: bookingId }) }
  markPaid(id: number) { return this.http.patch<Invoice>(`${this.base}/${id}/mark-paid`, {}) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class GamesApi {
  private http = inject(HttpClient)
  private base = `${API}/games`
  list() { return this.http.get<Game[]>(this.base) }
  get(id: number) { return this.http.get<Game>(`${this.base}/${id}`) }
  create(body: Json) { return this.http.post<Game>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Game>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class PublishersApi {
  private http = inject(HttpClient)
  private base = `${API}/publishers`
  list() { return this.http.get<Publisher[]>(this.base) }
  create(body: Json) { return this.http.post<Publisher>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Publisher>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class AuthorsApi {
  private http = inject(HttpClient)
  private base = `${API}/authors`
  list() { return this.http.get<Author[]>(this.base) }
  create(body: Json) { return this.http.post<Author>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Author>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private http = inject(HttpClient)
  private base = `${API}/users`
  list() { return this.http.get<User[]>(this.base) }
  pending() { return this.http.get<User[]>(`${this.base}/pending`) }
  create(body: Json) { return this.http.post<User>(this.base, body) }
  changeRole(id: number, role: string) { return this.http.patch<User>(`${this.base}/${id}/role`, { role }) }
  validate(id: number, role: string) { return this.http.patch<User>(`${this.base}/${id}/validate`, { role }) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class ArtistsApi {
  private http = inject(HttpClient)
  private base = `${API}/artists`
  list() { return this.http.get<Artist[]>(this.base) }
  get(id: number) { return this.http.get<Artist>(`${this.base}/${id}`) }
  create(body: Json) { return this.http.post<Artist>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Artist>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class EventArtistsApi {
  private http = inject(HttpClient)
  private base = `${API}/event-artists`
  list(eventId: number) { return this.http.get<EventArtist[]>(this.base + evt(eventId)) }
  add(body: Json) { return this.http.post<EventArtist>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<EventArtist>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class ScheduleSlotsApi {
  private http = inject(HttpClient)
  private base = `${API}/schedule-slots`
  list(eventId?: number) { return this.http.get<ScheduleSlot[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<ScheduleSlot>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<ScheduleSlot>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class ExpensesApi {
  private http = inject(HttpClient)
  private base = `${API}/expenses`
  list(params: { event_id?: number; status?: string; category?: string } = {}) {
    const q = new URLSearchParams()
    if (params.event_id) q.set('event_id', String(params.event_id))
    if (params.status) q.set('status', params.status)
    if (params.category) q.set('category', params.category)
    const qs = q.toString()
    return this.http.get<Expense[]>(qs ? `${this.base}?${qs}` : this.base)
  }
  create(body: Json) { return this.http.post<Expense>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<Expense>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class UploadsApi {
  private http = inject(HttpClient)
  upload(file: File, eventId?: number) {
    const form = new FormData()
    form.append('file', file)
    return this.http.post<UploadedImage>(`${API}/uploads${evt(eventId)}`, form)
  }
}

@Injectable({ providedIn: 'root' })
export class EventImagesApi {
  private http = inject(HttpClient)
  private base = `${API}/event-images`
  list(eventId?: number) { return this.http.get<EventImage[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<EventImage>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<EventImage>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class VenueMapsApi {
  private http = inject(HttpClient)
  private base = `${API}/venue-maps`
  templates() { return this.http.get<VenueTemplate[]>(`${API}/venue-templates`) }
  list(eventId?: number) { return this.http.get<VenueMap[]>(this.base + evt(eventId)) }
  get(id: number) { return this.http.get<VenueMap>(`${this.base}/${id}`) }
  create(body: Json) { return this.http.post<VenueMap>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<VenueMap>(`${this.base}/${id}`, body) }
  replaceElements(id: number, elements: Json[]) {
    return this.http.put<VenueMap>(`${this.base}/${id}/elements`, { elements })
  }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class TicketTypesApi {
  private http = inject(HttpClient)
  private base = `${API}/ticket-types`
  list(eventId?: number) { return this.http.get<TicketType[]>(this.base + evt(eventId)) }
  create(body: Json) { return this.http.post<TicketType>(this.base, body) }
  update(id: number, body: Json) { return this.http.put<TicketType>(`${this.base}/${id}`, body) }
  remove(id: number) { return this.http.delete(`${this.base}/${id}`) }
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private http = inject(HttpClient)
  private base = `${API}/orders`
  list(params: { event_id?: number; status?: string } = {}) {
    const q = new URLSearchParams()
    if (params.event_id) q.set('event_id', String(params.event_id))
    if (params.status) q.set('status', params.status)
    const qs = q.toString()
    return this.http.get<Order[]>(qs ? `${this.base}?${qs}` : this.base)
  }
  get(id: number) { return this.http.get<Order>(`${this.base}/${id}`) }
  cancel(id: number) { return this.http.patch<Order>(`${this.base}/${id}/cancel`, {}) }
  checkIn(code: string) { return this.http.post<CheckInResult>(`${this.base}/check-in`, { code }) }
}

@Injectable({ providedIn: 'root' })
export class PublicApi {
  private http = inject(HttpClient)
  private base = `${API}/public`
  events() { return this.http.get<PublicEvent[]>(`${this.base}/events`) }
  event(slug: string) { return this.http.get<PublicEventDetail>(`${this.base}/events/${slug}`) }
  ticketTypes(slug: string) { return this.http.get<PublicTicketType[]>(`${this.base}/events/${slug}/ticket-types`) }
  schedule(slug: string) { return this.http.get<PublicScheduleSlot[]>(`${this.base}/events/${slug}/schedule`) }
  map(slug: string) { return this.http.get<PublicVenueMap>(`${this.base}/events/${slug}/map`) }
  createOrder(body: Json) { return this.http.post<PublicOrderResult>(`${this.base}/orders`, body) }
  order(code: string) { return this.http.get<PublicOrderView>(`${this.base}/orders/${code}`) }
  verifyPayment(code: string) { return this.http.post<Order>(`${this.base}/orders/${code}/verify-payment`, {}) }
}
