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

// Generates realistic demo data across several event types. Wipes existing
// business data first (keeps event_types / pipeline_stages / users).
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

const EVENTS = [
  { type: 'festival', name: 'Montpellier Games Festival', current: true },
  { type: 'festival', name: 'Lyon Tabletop Weekend' },
  { type: 'fair', name: 'Spring Makers Fair' },
  { type: 'concert', name: 'Riverside Live' },
  { type: 'conference', name: 'DevWorld Conference' },
  { type: 'art_exhibition', name: 'Modern Canvas Expo' },
  { type: 'sports', name: 'City Padel Open' },
  { type: 'party', name: 'Neon Nights' },
]

async function eventTypeIdByKey(): Promise<Record<string, number>> {
  const { rows } = await pool.query<{ id: number; key: string }>('SELECT id, key FROM event_types')
  return Object.fromEntries(rows.map((r) => [r.key, r.id]))
}

async function wipe() {
  await pool.query('TRUNCATE events RESTART IDENTITY CASCADE')
  await pool.query('TRUNCATE games, game_authors, publishers, authors RESTART IDENTITY CASCADE')
}

async function main() {
  console.log('🌱 Seeding demo data...')
  await wipe()
  const typeId = await eventTypeIdByKey()

  // Shared games catalog (for festivals)
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
    const year = 2026
    const month = randInt(3, 11)
    const day = randInt(1, 20)
    const start = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(day + 2).padStart(2, '0')}`

    const event = await eventsService.createEvent({
      event_type_id: typeId[spec.type]!,
      name: spec.name,
      slug: spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      start_date: start,
      end_date: end,
      apply_template: true,
    })
    if (spec.current) await eventsService.setCurrentEvent(event.id)

    // Areas
    const areas = await Promise.all(
      Array.from({ length: randInt(2, 4) }, (_, i) =>
        areasRepo.createArea({ event_id: event.id, name: `Area ${String.fromCharCode(65 + i)}`, kind: pick(KINDS), capacity: randInt(50, 400) }),
      ),
    )

    // Resource types provisioned by the template; add inventory in areas
    const resourceTypes = await resourceTypesRepo.listResourceTypes(event.id)
    for (const area of areas) {
      for (const rt of resourceTypes) {
        await resourcesRepo.createResource({ event_id: event.id, area_id: area.id, resource_type_id: rt.id, total_quantity: randInt(5, 40) })
      }
    }

    const stages = await eventsService.getPipelineStages(event.id)
    const isFestival = spec.type === 'festival'

    // Participants + bookings
    const participantCount = randInt(5, 12)
    for (let i = 0; i < participantCount; i++) {
      const participant = await participantsRepo.createParticipant({
        event_id: event.id,
        name: `${pick(COMPANIES)} ${pick(SUFFIX)}`,
        participant_type: isFestival ? 'exhibitor' : pick(['vendor', 'performer', 'sponsor', 'exhibitor']),
      })
      await participantsRepo.addContact(participant.id, { name: `${pick(FIRST)} ${pick(LAST)}`, email: `contact${i}@example.com` })

      if (Math.random() < 0.8) {
        const stage = pick(stages)
        const booking = await bookingsRepo.createBooking({
          event_id: event.id,
          participant_id: participant.id,
          stage_id: stage?.id,
          discount_amount: Math.random() < 0.3 ? randInt(10, 50) : 0,
        })
        // Booked resources
        for (const rt of sample(resourceTypes, randInt(1, resourceTypes.length))) {
          await bookingsRepo.addBookedResource(booking.id, { resource_type_id: rt.id, quantity: randInt(1, 5), unit_price: pick([20, 25, 30, 40, 50]) })
        }
        // Games presented (festival only)
        if (isFestival) {
          for (const g of sample(games, randInt(1, 4))) {
            await bookingsRepo.addBookingItem(booking.id, { item_type: 'game', item_ref: g.id, quantity: randInt(1, 3) })
          }
        }
        // Invoice for ~60%
        if (Math.random() < 0.6) {
          const invoice = await invoicesService.generateForBooking(booking.id)
          if (Math.random() < 0.5) await invoicesService.markPaid(invoice.id)
        }
      }
    }
    console.log(`  ✓ ${spec.name} (${spec.type})`)
  }

  const counts = await pool.query<{ events: number; bookings: number; invoices: number }>(
    `SELECT (SELECT count(*)::int FROM events) AS events,
            (SELECT count(*)::int FROM bookings) AS bookings,
            (SELECT count(*)::int FROM invoices) AS invoices`,
  )
  console.log('✅ Done:', counts.rows[0])
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
