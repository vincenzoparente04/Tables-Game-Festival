// Admin-side accent colors, same palette family as event-colors.ts (public).
//   • categorical    — one fixed color per kind/type (artists, participants, slots)
//   • semantic scale — graduated, but anchored on meaning: GREEN = best outcome
//     (paid / confirmed / on sale), RED = worst (cancelled / lost), with a
//     gray → blue → violet → amber progression in between.
//
// NB: deliberately no teal/cyan in these ramps — interpolating blue→green by hue
// passes through cyan, which read as "verde acqua" and made the worst case green.

const NEUTRAL = '#9aa0b4' // not started / unknown
const GOOD = '#4bcd79' // settled / confirmed / selling
const BAD = '#ef5d5d' // cancelled / lost
const BLUE = '#5b8efb'
const VIOLET = '#8b5cf6'
const AMBER = '#f59e2c'

const pick = (map: Record<string, string>, k?: string | null) => (k && map[k]) || NEUTRAL

const ARTIST_KIND: Record<string, string> = {
  musician: '#3e7bfa', band: BLUE, dj: '#6d5cf6', painter: VIOLET,
  sculptor: '#c084fc', photographer: '#3fc7c7', performer: AMBER, collective: GOOD,
}
export const artistKindColor = (k?: string | null) => pick(ARTIST_KIND, k)

const PARTICIPANT_TYPE: Record<string, string> = {
  exhibitor: '#3e7bfa', vendor: '#3fc7c7', performer: VIOLET, sponsor: AMBER,
  provider: BLUE, association: GOOD, attendee: '#c084fc',
}
export const participantTypeColor = (k?: string | null) => pick(PARTICIPANT_TYPE, k)

const SLOT_KIND: Record<string, string> = {
  performance: '#3e7bfa', exhibition: VIOLET, talk: '#3fc7c7',
  workshop: AMBER, screening: '#c084fc',
}
export const slotKindColor = (k?: string | null) => pick(SLOT_KIND, k)

// Agreement pipeline stages (data-driven keys → resolved by the caller).
// Progression gray → blue → violet → amber, with confirmed=green, cancelled=red.
const STAGE: Record<string, string> = {
  not_contacted: NEUTRAL, pending: NEUTRAL,
  contacted: BLUE, in_discussion: VIOLET, reserved: AMBER,
  confirmed: GOOD, won: GOOD, completed: GOOD, signed: GOOD, booked: GOOD,
  cancelled: BAD, canceled: BAD, lost: BAD, rejected: BAD, declined: BAD,
}
export const stageColor = (key?: string | null) => pick(STAGE, key)

const INVOICE: Record<string, string> = { draft: NEUTRAL, issued: AMBER, paid: GOOD, cancelled: BAD }
export const invoiceStatusColor = (s?: string | null) => pick(INVOICE, s)

const EXPENSE: Record<string, string> = { planned: BLUE, committed: AMBER, paid: GOOD }
export const expenseStatusColor = (s?: string | null) => pick(EXPENSE, s)

const TIER: Record<string, string> = { hidden: NEUTRAL, paused: AMBER, on_sale: GOOD }
export const tierStatusColor = (s?: string | null) => pick(TIER, s)

// Orders branch off (cancelled/expired/refunded), so a semantic palette:
// amber → green progress, off-ramps muted/red/violet.
const ORDER: Record<string, string> = {
  pending: AMBER, confirmed: GOOD, refunded: VIOLET, cancelled: BAD, expired: NEUTRAL,
}
export const orderStatusColor = (s?: string | null) => pick(ORDER, s)
