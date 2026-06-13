import 'dotenv/config'
import pool from '../src/db/database.js'
import * as eventsService from '../src/services/events.service.js'
import * as areasRepo from '../src/repositories/areas.repo.js'
import * as resourceTypesRepo from '../src/repositories/resource-types.repo.js'
import * as resourcesRepo from '../src/repositories/resources.repo.js'
import * as participantsRepo from '../src/repositories/participants.repo.js'
import * as bookingsRepo from '../src/repositories/bookings.repo.js'
import * as publishersRepo from '../src/repositories/publishers.repo.js'
import * as authorsRepo from '../src/repositories/authors.repo.js'
import * as gamesRepo from '../src/repositories/games.repo.js'
import * as invoicesService from '../src/services/invoices.service.js'
import * as artistsRepo from '../src/repositories/artists.repo.js'
import * as eventArtistsRepo from '../src/repositories/event-artists.repo.js'
import * as scheduleRepo from '../src/repositories/schedule-slots.repo.js'
import * as expensesRepo from '../src/repositories/expenses.repo.js'
import * as venueMapsRepo from '../src/repositories/venue-maps.repo.js'
import * as ticketTypesRepo from '../src/repositories/ticket-types.repo.js'
import * as ordersRepo from '../src/repositories/orders.repo.js'
import { getVenueTemplate } from '../src/services/venue-templates.js'
import { shortCode } from '../src/services/short-code.js'

// Generates a realistic, demo-ready dataset: published events with heroes,
// lineups, schedules, venue maps, ticket tiers, visitor orders and expenses.
// Wipes existing business data first (keeps event_types / pipelines / users).
// Usage: DATABASE_URL=... npm run seed:demo

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const sample = <T>(arr: readonly T[], n: number): T[] =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, n)

const COMPANIES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Soylent', 'Wonka', 'Cyberdyne', 'Pied Piper', 'Aperture', 'Tyrell', 'Oscorp', 'Massive Dynamic']
const SUFFIX = ['Ltd', 'Studio', 'Collective', 'Group', 'Works', 'Lab', 'Co.']
const FIRST = ['Bruno', 'Marie', 'Luca', 'Sofia', 'Antoine', 'Chiara', 'Marco', 'Elena', 'Paul', 'Nadia', 'Diego', 'Iris']
const LAST = ['Cathala', 'Rossi', 'Martin', 'Garcia', 'Bauer', 'Nguyen', 'Khan', 'Silva', 'Moreau', 'Ferrari']
const GAME_NAMES = ['Seasons', 'Azul', 'Catan', 'Carcassonne', 'Wingspan', 'Splendor', '7 Wonders', 'Terraforming Mars', 'Dixit', 'Pandemic', 'Ticket to Ride', 'Root', 'Scythe', 'Everdell', 'Brass']
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
  {
    type: 'concert', name: 'Riverside Live', featured: true, template: 'stadium', heroSeed: 'riverside',
    ticketTiers: [{ name: 'Standard', price: 25, capacity: 400 }, { name: 'VIP', price: 60, capacity: 50 }],
  },
  {
    type: 'art_exhibition', name: 'Modern Canvas Expo', current: true, template: 'gallery', heroSeed: 'canvas',
    ticketTiers: [{ name: 'Free entry', price: 0 }],
  },
  {
    type: 'festival', name: 'Open Air Arts Festival', template: 'park', heroSeed: 'openair',
    ticketTiers: [{ name: 'Day pass', price: 12, capacity: 800 }, { name: 'Weekend pass', price: 20, capacity: 300 }],
  },
  {
    type: 'party', name: 'Neon Nights', template: 'club', heroSeed: 'neon',
    ticketTiers: [{ name: 'Entry', price: 15, capacity: 250 }],
  },
  {
    type: 'fair', name: 'Spring Makers Fair', template: 'fair_pavilion', heroSeed: 'makers',
    ticketTiers: [{ name: 'Free entry', price: 0 }],
  },
  {
    type: 'concert', name: 'Chamber Echoes', template: 'theater', heroSeed: 'chamber',
    ticketTiers: [{ name: 'Parterre', price: 30, capacity: 180 }, { name: 'Balcony', price: 18, capacity: 120 }],
  },
]

async function eventTypeIdByKey(): Promise<Record<string, number>> {
  const { rows } = await pool.query<{ id: number; key: string }>('SELECT id, key FROM event_types')
  return Object.fromEntries(rows.map((r) => [r.key, r.id]))
}

async function wipe() {
  await pool.query('TRUNCATE events RESTART IDENTITY CASCADE')
  await pool.query('TRUNCATE games, game_authors, publishers, authors RESTART IDENTITY CASCADE')
  await pool.query('TRUNCATE artists RESTART IDENTITY CASCADE')
}

const hero = (seed: string) => `https://picsum.photos/seed/${seed}/1600/700`

async function main() {
  console.log('🌱 Seeding demo data...')
  await wipe()
  const typeId = await eventTypeIdByKey()

  // Global artist catalog
  const artists = await Promise.all(
    ARTISTS.map((a, i) =>
      artistsRepo.createArtist({
        name: a.name,
        kind: a.kind,
        bio: `${a.name} — ${a.kind} featured across our recent seasons.`,
        image_url: `https://picsum.photos/seed/artist${i}/400/400`,
        links: { website: `https://example.com/${a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      }),
    ),
  )

  // Legacy games catalog (kept for the pluggable games module)
  const publishers = await Promise.all(
    sample(COMPANIES, 6).map((c) => publishersRepo.createPublisher({ name: `${c} ${pick(SUFFIX)}` })),
  )
  const authors = await Promise.all(
    Array.from({ length: 10 }, () => authorsRepo.createAuthor({ first_name: pick(FIRST), last_name: pick(LAST) })),
  )
  const games = await Promise.all(
    sample(GAME_NAMES, 12).map((name) =>
      gamesRepo.createGame({
        name,
        publisher_id: pick(publishers).id,
        min_players: randInt(1, 2),
        max_players: randInt(3, 6),
        min_age: pick([6, 8, 10, 12, 14]),
        average_duration: pick([20, 30, 45, 60, 90]),
        author_ids: sample(authors, randInt(1, 2)).map((a) => a.id),
      }),
    ),
  )

  for (const spec of EVENTS) {
    const month = randInt(7, 11)
    const day = randInt(1, 20)
    const start = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const end = `2026-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`

    const event = await eventsService.createEvent({
      event_type_id: typeId[spec.type]!,
      name: spec.name,
      subtitle: pick([
        'Two days of sound and color', 'Art you can walk through', 'One night only',
        'The season opener', 'Independent makers, live music',
      ]),
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
    if (spec.current) await eventsService.setCurrentEvent(event.id)
    if (spec.featured) await eventsService.setFeaturedEvent(event.id)

    // Gallery images
    for (let i = 0; i < 4; i++) {
      await pool.query(
        `INSERT INTO event_images (event_id, url, kind, position) VALUES ($1, $2, 'gallery', $3)`,
        [event.id, `https://picsum.photos/seed/${spec.heroSeed}g${i}/900/700`, i],
      )
    }

    // Areas (always include a stage for the schedule)
    const stageArea = await areasRepo.createArea({ event_id: event.id, name: 'Main Stage', kind: 'stage', capacity: randInt(200, 600) })
    const areas = [stageArea]
    for (let i = 0; i < randInt(1, 3); i++) {
      areas.push(await areasRepo.createArea({
        event_id: event.id, name: `Area ${String.fromCharCode(66 + i)}`, kind: pick(KINDS), capacity: randInt(50, 400),
      }))
    }

    const resourceTypes = await resourceTypesRepo.listResourceTypes(event.id)
    for (const area of areas) {
      for (const rt of resourceTypes) {
        await resourcesRepo.createResource({ event_id: event.id, area_id: area.id, resource_type_id: rt.id, total_quantity: randInt(5, 40) })
      }
    }

    const stages = await eventsService.getPipelineStages(event.id)
    const isFestival = spec.type === 'festival'

    // Lineup + artist agreements
    const lineup = sample(artists, randInt(4, 7))
    const artistBookings: number[] = []
    for (let i = 0; i < lineup.length; i++) {
      const artist = lineup[i]!
      const participant = await participantsRepo.createParticipant({
        event_id: event.id, name: artist.name, participant_type: 'performer',
      })
      const booking = await bookingsRepo.createBooking({
        event_id: event.id, participant_id: participant.id, kind: 'artist',
        stage_id: stages.find((s) => s.key === 'confirmed')?.id ?? pick(stages)?.id,
      })
      artistBookings.push(booking.id)
      await eventArtistsRepo.createEventArtist({
        event_id: event.id, artist_id: artist.id, booking_id: booking.id,
        is_headliner: i === 0, display_order: i,
      })
      // artist fee as an expense
      await expensesRepo.createExpense({
        event_id: event.id, booking_id: booking.id, participant_id: participant.id,
        category: 'artist_fee', description: `Fee — ${artist.name}`,
        amount: randInt(300, 2500), status: pick(['committed', 'paid', 'planned']),
      })
    }

    // Schedule: two days on the main stage + side area
    for (let dayIdx = 0; dayIdx < 2; dayIdx++) {
      const date = dayIdx === 0 ? start : end
      let hour = 15 // 4 slots max, 2h apart → last one ends 22:30
      for (const artist of sample(lineup, Math.min(lineup.length, randInt(3, 4)))) {
        await scheduleRepo.createScheduleSlot({
          event_id: event.id,
          area_id: pick([stageArea, ...(areas.length > 1 ? [areas[1]!] : [])]).id,
          artist_id: artist.id,
          title: `${artist.name} — ${pick(['live set', 'showcase', 'opening', 'special performance'])}`,
          kind: pick(['performance', 'exhibition', 'talk']),
          starts_at: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z`,
          ends_at: `${date}T${String(hour + 1).padStart(2, '0')}:30:00.000Z`,
        })
        hour += 2
      }
    }

    // Exhibitors / vendors / sponsors
    const vendorBookings: number[] = []
    for (let i = 0; i < randInt(4, 9); i++) {
      const kind = pick(['exhibitor', 'vendor', 'sponsor'] as const)
      const participant = await participantsRepo.createParticipant({
        event_id: event.id,
        name: `${pick(COMPANIES)} ${pick(SUFFIX)}`,
        participant_type: kind === 'vendor' ? 'provider' : kind,
      })
      await participantsRepo.addContact(participant.id, { name: `${pick(FIRST)} ${pick(LAST)}`, email: `contact${i}@example.com` })
      const booking = await bookingsRepo.createBooking({
        event_id: event.id, participant_id: participant.id, kind,
        stage_id: pick(stages)?.id,
        discount_amount: Math.random() < 0.3 ? randInt(10, 50) : 0,
      })
      vendorBookings.push(booking.id)
      for (const rt of sample(resourceTypes, Math.max(1, randInt(1, resourceTypes.length)))) {
        await bookingsRepo.addBookedResource(booking.id, { resource_type_id: rt.id, quantity: randInt(1, 5), unit_price: pick([20, 25, 30, 40, 50]) })
      }
      if (isFestival) {
        for (const g of sample(games, randInt(1, 3))) {
          await bookingsRepo.addBookingItem(booking.id, { item_type: 'game', item_ref: g.id, quantity: randInt(1, 3) })
        }
      }
      if (Math.random() < 0.6) {
        const invoice = await invoicesService.generateForBooking(booking.id)
        if (Math.random() < 0.5) await invoicesService.markPaid(invoice.id)
      }
    }

    // Self-managed expenses
    for (const e of sample(EXPENSE_SPECS, randInt(4, 6))) {
      await expensesRepo.createExpense({
        event_id: event.id, category: e.category, description: e.description,
        amount: randInt(e.range[0], e.range[1]), status: pick(['planned', 'committed', 'paid']),
        due_date: start,
      })
    }

    // Venue map from the matching template, with linked elements
    const template = getVenueTemplate(spec.template)!
    const map = await venueMapsRepo.createVenueMap({
      event_id: event.id, name: 'Grounds plan', template_key: spec.template,
      width: template.canvas.width, height: template.canvas.height,
      background: template.background as unknown[],
    })
    const W = template.canvas.width
    const H = template.canvas.height
    const elements: Parameters<typeof venueMapsRepo.replaceMapElements>[1] = [
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
    await venueMapsRepo.replaceMapElements(map.id, elements)

    // Ticket tiers + visitor orders
    const tiers = []
    for (let i = 0; i < spec.ticketTiers.length; i++) {
      const t = spec.ticketTiers[i]!
      tiers.push(await ticketTypesRepo.createTicketType({
        event_id: event.id, name: t.name, price: t.price,
        ...(t.capacity !== undefined ? { capacity: t.capacity } : {}),
        description: t.price === 0 ? 'Free admission — registration recommended' : undefined,
        position: i,
      }))
    }
    for (let i = 0; i < randInt(6, 14); i++) {
      const tier = pick(tiers)
      const qty = randInt(1, 3)
      const name = `${pick(FIRST)} ${pick(LAST)}`
      await ordersRepo.createOrderWithTickets({
        event_id: event.id,
        code: shortCode(10),
        customer_name: name,
        customer_email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
        status: 'confirmed',
        total_amount: Number(tier.price) * qty,
        currency: tier.currency,
        payment_provider: 'none',
        expires_at: null,
        tickets: Array.from({ length: qty }, () => ({ ticket_type_id: tier.id, code: shortCode(12) })),
      })
    }

    console.log(`  ✓ ${spec.name} (${spec.type}) — lineup ${lineup.length}, map, tickets, expenses`)
  }

  const counts = await pool.query(
    `SELECT (SELECT count(*)::int FROM events) AS events,
            (SELECT count(*)::int FROM artists) AS artists,
            (SELECT count(*)::int FROM bookings) AS bookings,
            (SELECT count(*)::int FROM schedule_slots) AS slots,
            (SELECT count(*)::int FROM map_elements) AS map_elements,
            (SELECT count(*)::int FROM orders) AS orders,
            (SELECT count(*)::int FROM expenses) AS expenses`,
  )
  console.log('✅ Done:', counts.rows[0])
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
