import 'dotenv/config'

// Seeds a live deployment with demo data THROUGH THE REST API — not the DB.
// Use this for production (Neon), where a direct Postgres connection isn't
// reachable from a dev machine: everything goes over HTTPS via the admin API,
// exercising the same validation/pricing/slug logic the real app uses.
//
// Usage:
//   ADMIN_LOGIN=... ADMIN_PASSWORD=... npm run seed:prod-api
//
// Config (env):
//   API_URL        full API base, default https://tables-game-festival.onrender.com/api
//   ADMIN_LOGIN    admin login for the TARGET deployment (read from backend/.env if present)
//   ADMIN_PASSWORD admin password for the TARGET deployment (never logged)
//   SEED_FORCE=1   seed even if the deployment already has events (otherwise it refuses)
//   SEED_ORDERS=1  also create a few free-tier guest orders (sends confirmation emails — off by default)
//
// Local testing against the dev backend (self-signed cert):
//   API_URL=https://localhost:4000/api NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:prod-api

const API_URL = (process.env.API_URL ?? 'https://tables-game-festival.onrender.com/api').replace(/\/$/, '')
const ADMIN_LOGIN = process.env.ADMIN_LOGIN
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const FORCE = process.env.SEED_FORCE === '1'
const SEED_ORDERS = process.env.SEED_ORDERS === '1'

if (!ADMIN_LOGIN || !ADMIN_PASSWORD) {
  console.error('✖ ADMIN_LOGIN and ADMIN_PASSWORD must be set (env or backend/.env). Aborting.')
  process.exit(1)
}

// ---------- tiny typed HTTP client with cookie auth ----------

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

let cookie = ''

async function login(): Promise<void> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: ADMIN_LOGIN, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status}). Check ADMIN_LOGIN/ADMIN_PASSWORD for ${API_URL}. ${body}`)
  }
  const pairs = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).filter(Boolean)
  if (pairs.length === 0) throw new Error('Login succeeded but no auth cookie was returned.')
  cookie = pairs.join('; ')
}

async function api<T>(method: string, path: string, body?: unknown, retryAuth = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && retryAuth) {
    await login()
    return api<T>(method, path, body, false)
  }
  if (!res.ok) {
    let detail: string
    try {
      detail = JSON.stringify(await res.json())
    } catch {
      detail = await res.text()
    }
    throw new ApiError(`${method} ${path} → ${res.status}: ${detail}`, res.status)
  }
  return (await res.json()) as T
}

const get = <T>(path: string) => api<T>('GET', path)
const post = <T>(path: string, body: unknown) => api<T>('POST', path, body)
const patch = <T>(path: string, body: unknown = {}) => api<T>('PATCH', path, body)
const put = <T>(path: string, body: unknown) => api<T>('PUT', path, body)

// ---------- response shapes (only the fields we use) ----------

interface WithId { id: number }
interface Keyed { id: number; key: string }
interface TierResp { id: number; price: number | string; currency: string }
interface TemplateResp {
  key: string
  canvas: { width: number; height: number }
  background: unknown[]
}

// ---------- demo data (arts domain; games module intentionally omitted) ----------

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const sample = <T>(arr: readonly T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n)
const hero = (seed: string) => `https://picsum.photos/seed/${seed}/1600/700`

const COMPANIES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Soylent', 'Wonka', 'Cyberdyne', 'Pied Piper', 'Aperture', 'Tyrell', 'Oscorp', 'Massive Dynamic']
const SUFFIX = ['Ltd', 'Studio', 'Collective', 'Group', 'Works', 'Lab', 'Co.']
const FIRST = ['Bruno', 'Marie', 'Luca', 'Sofia', 'Antoine', 'Chiara', 'Marco', 'Elena', 'Paul', 'Nadia', 'Diego', 'Iris']
const LAST = ['Cathala', 'Rossi', 'Martin', 'Garcia', 'Bauer', 'Nguyen', 'Khan', 'Silva', 'Moreau', 'Ferrari']
const KINDS = ['indoor', 'outdoor', 'stage'] as const

const ARTISTS: { name: string; kind: string }[] = [
  { name: 'The Nebulas', kind: 'band' },
  { name: 'Aria Vox', kind: 'musician' },
  { name: 'DJ Meridian', kind: 'dj' },
  { name: 'Lumen Duo', kind: 'band' },
  { name: 'Sasha Verne', kind: 'painter' },
  { name: 'Atelier Nova', kind: 'collective' },
  { name: 'Elodie March', kind: 'photographer' },
  { name: 'Kraft & Söhne', kind: 'sculptor' },
  { name: 'Velvet Static', kind: 'band' },
  { name: 'Mono Lisa', kind: 'performer' },
  { name: 'Rio Ardent', kind: 'dj' },
  { name: 'Paper Tigers', kind: 'collective' },
]

const EXPENSE_SPECS = [
  { category: 'security', description: 'Night security shifts', range: [600, 1800] },
  { category: 'technicians', description: 'Sound & light crew', range: [800, 2500] },
  { category: 'rental', description: 'Venue rental', range: [1500, 6000] },
  { category: 'bar_supplies', description: 'Bar stock (self-managed)', range: [400, 1500] },
  { category: 'catering', description: 'Artist catering', range: [200, 900] },
  { category: 'marketing', description: 'Posters & social ads', range: [150, 800] },
  { category: 'logistics', description: 'Fencing and signage', range: [200, 1200] },
  { category: 'cleaning', description: 'Post-event cleaning', range: [150, 600] },
] as const

interface EventSpec {
  type: string
  name: string
  current?: boolean
  featured?: boolean
  template: string
  heroSeed: string
  ticketTiers: { name: string; price: number; capacity?: number }[]
}

const EVENTS: EventSpec[] = [
  { type: 'concert', name: 'Riverside Live', featured: true, template: 'stadium', heroSeed: 'riverside', ticketTiers: [{ name: 'Standard', price: 25, capacity: 400 }, { name: 'VIP', price: 60, capacity: 50 }] },
  { type: 'art_exhibition', name: 'Modern Canvas Expo', current: true, template: 'gallery', heroSeed: 'canvas', ticketTiers: [{ name: 'Free entry', price: 0 }] },
  { type: 'festival', name: 'Open Air Arts Festival', template: 'park', heroSeed: 'openair', ticketTiers: [{ name: 'Day pass', price: 12, capacity: 800 }, { name: 'Weekend pass', price: 20, capacity: 300 }] },
  { type: 'party', name: 'Neon Nights', template: 'club', heroSeed: 'neon', ticketTiers: [{ name: 'Entry', price: 15, capacity: 250 }] },
  { type: 'fair', name: 'Spring Makers Fair', template: 'fair_pavilion', heroSeed: 'makers', ticketTiers: [{ name: 'Free entry', price: 0 }] },
  { type: 'concert', name: 'Chamber Echoes', template: 'theater', heroSeed: 'chamber', ticketTiers: [{ name: 'Parterre', price: 30, capacity: 180 }, { name: 'Balcony', price: 18, capacity: 120 }] },
]

// ---------- seeding ----------

const counts = { events: 0, artists: 0, bookings: 0, slots: 0, mapElements: 0, tickets: 0, expenses: 0, images: 0, invoices: 0, orders: 0 }
let failures = 0
let ordersCreated = 0
const ORDER_BUDGET = 6 // stay well under the public order rate limit

async function seedEvent(
  spec: EventSpec,
  typeId: Record<string, number>,
  artistIds: number[],
  templates: Record<string, TemplateResp>,
): Promise<void> {
  const eventTypeId = typeId[spec.type]
  if (!eventTypeId) {
    console.warn(`  ⚠ skipping "${spec.name}": event type "${spec.type}" not found on this deployment`)
    return
  }

  const month = randInt(7, 11)
  const day = randInt(1, 20)
  const start = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const end = `2026-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`

  const event = await post<WithId>('/events', {
    event_type_id: eventTypeId,
    name: spec.name,
    subtitle: pick(['Two days of sound and color', 'Art you can walk through', 'One night only', 'The season opener', 'Independent makers, live music']),
    description: `${spec.name} brings together artists, makers and performers for an unforgettable experience. Food, drinks and surprises on site — bring your friends.`,
    venue: pick(['Parco Nord', 'Palazzo delle Arti', 'Riverside Arena', 'Hangar 21', 'Teatro Apollo']),
    location_address: pick(['Via delle Rose 12, Milano', 'Quai des Arts 3, Lyon', 'Plaza Mayor 8, Madrid']),
    start_date: start,
    end_date: end,
    start_time: pick(['10:00', '16:00', '18:00']),
    end_time: pick(['23:00', '23:30', '02:00']),
    status: 'published',
    hero_image_url: hero(spec.heroSeed),
    apply_template: true,
  })
  counts.events++
  if (spec.current) await patch(`/events/${event.id}/set-current`)
  if (spec.featured) await patch(`/events/${event.id}/set-featured`)

  // Gallery images
  for (let i = 0; i < 4; i++) {
    await post('/event-images', { event_id: event.id, url: `https://picsum.photos/seed/${spec.heroSeed}g${i}/900/700`, kind: 'gallery', position: i })
    counts.images++
  }

  // Areas (always include a stage so the schedule and map have a target)
  const stageArea = await post<WithId>('/areas', { event_id: event.id, name: 'Main Stage', kind: 'stage', capacity: randInt(200, 600) })
  const areas: WithId[] = [stageArea]
  for (let i = 0; i < randInt(1, 3); i++) {
    areas.push(await post<WithId>('/areas', { event_id: event.id, name: `Area ${String.fromCharCode(66 + i)}`, kind: pick(KINDS), capacity: randInt(50, 400) }))
  }

  // Resources from the template-provisioned resource types
  const resourceTypes = await get<WithId[]>(`/resource-types?event_id=${event.id}`)
  for (const area of areas) {
    for (const rt of resourceTypes) {
      await post('/resources', { event_id: event.id, area_id: area.id, resource_type_id: rt.id, total_quantity: randInt(5, 40) })
    }
  }

  const stages = await get<Keyed[]>(`/events/${event.id}/pipeline`)
  const confirmedStage = stages.find((s) => s.key === 'confirmed')?.id ?? stages[0]?.id

  // Lineup + artist agreements + artist-fee expenses
  const lineup = sample(artistIds, randInt(4, 7))
  for (let i = 0; i < lineup.length; i++) {
    const artistId = lineup[i]!
    const participant = await post<WithId>('/participants', { event_id: event.id, name: `Artist ${artistId}`, participant_type: 'performer' })
    const booking = await post<WithId>('/bookings', { event_id: event.id, participant_id: participant.id, kind: 'artist', stage_id: confirmedStage })
    counts.bookings++
    await post('/event-artists', { event_id: event.id, artist_id: artistId, booking_id: booking.id, is_headliner: i === 0, display_order: i })
    await post('/expenses', { event_id: event.id, booking_id: booking.id, participant_id: participant.id, category: 'artist_fee', description: `Fee — artist ${artistId}`, amount: randInt(300, 2500), status: pick(['committed', 'paid', 'planned']) })
    counts.expenses++
  }

  // Schedule: two days, confirmed + public so they show on the public site
  const sideArea = areas[1] ?? stageArea
  for (let dayIdx = 0; dayIdx < 2; dayIdx++) {
    const date = dayIdx === 0 ? start : end
    let hour = 15
    for (const artistId of sample(lineup, Math.min(lineup.length, randInt(3, 4)))) {
      await post('/schedule-slots', {
        event_id: event.id,
        area_id: pick([stageArea, sideArea]).id,
        artist_id: artistId,
        title: `Artist ${artistId} — ${pick(['live set', 'showcase', 'opening', 'special performance'])}`,
        kind: pick(['performance', 'exhibition', 'talk']),
        starts_at: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`,
        ends_at: `${date}T${String(hour + 1).padStart(2, '0')}:30:00.000Z`,
        status: 'confirmed',
        is_public: true,
      })
      counts.slots++
      hour += 2
    }
  }

  // Exhibitors / vendors / sponsors with booked resources + some invoices
  const vendorBookings: number[] = []
  for (let i = 0; i < randInt(4, 9); i++) {
    const kind = pick(['exhibitor', 'vendor', 'sponsor'] as const)
    const participant = await post<WithId>('/participants', { event_id: event.id, name: `${pick(COMPANIES)} ${pick(SUFFIX)}`, participant_type: kind === 'vendor' ? 'provider' : kind })
    await post(`/participants/${participant.id}/contacts`, { name: `${pick(FIRST)} ${pick(LAST)}`, email: `contact${i}@example.com` })
    const booking = await post<WithId>('/bookings', { event_id: event.id, participant_id: participant.id, kind, stage_id: pick(stages).id, discount_amount: Math.random() < 0.3 ? randInt(10, 50) : 0 })
    counts.bookings++
    vendorBookings.push(booking.id)
    for (const rt of sample(resourceTypes, Math.max(1, randInt(1, resourceTypes.length)))) {
      await post(`/bookings/${booking.id}/resources`, { resource_type_id: rt.id, quantity: randInt(1, 5), unit_price: pick([20, 25, 30, 40, 50]) })
    }
    if (Math.random() < 0.6) {
      const invoice = await post<WithId>('/invoices/generate', { booking_id: booking.id })
      counts.invoices++
      if (Math.random() < 0.5) await patch(`/invoices/${invoice.id}/mark-paid`)
    }
  }

  // Self-managed expenses
  for (const e of sample(EXPENSE_SPECS, randInt(4, 6))) {
    await post('/expenses', { event_id: event.id, category: e.category, description: e.description, amount: randInt(e.range[0], e.range[1]), status: pick(['planned', 'committed', 'paid']), due_date: start })
    counts.expenses++
  }

  // Venue map from the matching template (fall back to any template on key mismatch)
  const template = templates[spec.template] ?? Object.values(templates)[0]
  if (template) {
    const W = template.canvas.width
    const H = template.canvas.height
    const map = await post<WithId>('/venue-maps', {
      event_id: event.id, name: 'Grounds plan', template_key: template.key,
      width: W, height: H, background: template.background, is_public: true,
    })
    const elements: Record<string, unknown>[] = [
      { kind: 'stage', label: 'Main Stage', x: W * 0.38, y: H * 0.12, width: 260, height: 130, capacity: 500, area_id: stageArea.id },
      { kind: 'entrance', label: 'Gate A', x: W * 0.46, y: H - 60, width: 90, height: 34 },
      { kind: 'bar', label: 'Main Bar', x: W * 0.12, y: H * 0.55, width: 150, height: 60, capacity: 80 },
      { kind: 'food', label: 'Street food', x: W * 0.72, y: H * 0.6, width: 130, height: 60, capacity: 60 },
      { kind: 'wc', x: W * 0.85, y: H * 0.82, width: 60, height: 50 },
      { kind: 'info', label: 'Info point', x: W * 0.08, y: H * 0.82, width: 60, height: 50 },
    ]
    let sx = W * 0.25
    for (const bookingId of vendorBookings.slice(0, 6)) {
      elements.push({ kind: 'stand', booking_id: bookingId, x: sx, y: H * 0.4, width: 80, height: 60, capacity: 15 })
      sx += 100
    }
    await put(`/venue-maps/${map.id}/elements`, { elements })
    counts.mapElements += elements.length
  } else {
    console.warn('  ⚠ no venue templates available — skipping map')
  }

  // Ticket types — explicitly on_sale so they are public and sellable
  const tiers: TierResp[] = []
  for (let i = 0; i < spec.ticketTiers.length; i++) {
    const t = spec.ticketTiers[i]!
    tiers.push(await post<TierResp>('/ticket-types', {
      event_id: event.id, name: t.name, price: t.price, status: 'on_sale', position: i,
      ...(t.capacity !== undefined ? { capacity: t.capacity } : {}),
      ...(t.price === 0 ? { description: 'Free admission — registration recommended' } : {}),
    }))
    counts.tickets++
  }

  // Optional: a couple of confirmed guest orders on a free tier (sends emails)
  if (SEED_ORDERS && ordersCreated < ORDER_BUDGET) {
    const freeTier = tiers.find((t) => Number(t.price) === 0)
    if (freeTier) {
      try {
        const name = `${pick(FIRST)} ${pick(LAST)}`
        await post('/public/orders', {
          event_id: event.id,
          customer_name: name,
          customer_email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
          items: [{ ticket_type_id: freeTier.id, quantity: randInt(1, 2) }],
        })
        counts.orders++
        ordersCreated++
      } catch (err) {
        console.warn(`  ⚠ order skipped: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  console.log(`  ✓ ${spec.name} (${spec.type}) — lineup ${lineup.length}, vendors ${vendorBookings.length}, map, tickets`)
}

async function main(): Promise<void> {
  console.log(`🌱 Seeding ${API_URL} via REST API …`)
  await login()

  const existing = await get<WithId[]>('/events')
  if (existing.length > 0 && !FORCE) {
    console.error(`✖ This deployment already has ${existing.length} event(s). Re-running would duplicate data.\n  Set SEED_FORCE=1 to seed anyway.`)
    process.exit(1)
  }

  const typeId = Object.fromEntries((await get<Keyed[]>('/event-types')).map((t) => [t.key, t.id]))
  const templates = Object.fromEntries((await get<TemplateResp[]>('/venue-templates')).map((t) => [t.key, t]))

  // Global artist catalog
  const artistIds: number[] = []
  for (let i = 0; i < ARTISTS.length; i++) {
    const a = ARTISTS[i]!
    const artist = await post<WithId>('/artists', {
      name: a.name, kind: a.kind,
      bio: `${a.name} — ${a.kind} featured across our recent seasons.`,
      image_url: `https://picsum.photos/seed/artist${i}/400/400`,
      links: { website: `https://example.com/${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
    })
    artistIds.push(artist.id)
    counts.artists++
  }

  for (const spec of EVENTS) {
    try {
      await seedEvent(spec, typeId, artistIds, templates)
    } catch (err) {
      failures++
      console.error(`  ✖ ${spec.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('\n✅ Done:', counts)
  if (!SEED_ORDERS) console.log('   (orders skipped — set SEED_ORDERS=1 to create a few free-tier guest orders)')
  if (failures > 0) {
    console.error(`\n⚠ ${failures} event(s) failed — see errors above.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\n✖ Seed aborted:', err instanceof Error ? err.message : err)
  process.exit(1)
})
