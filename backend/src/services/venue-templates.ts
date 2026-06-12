// Venue map templates: one starting canvas per location category. Code-shaped
// static config (same precedent as event-templates.ts): the chosen template's
// background is COPIED into the new venue_map, so editing a template later
// never mutates existing maps. Promote to a DB table only if templates ever
// become user-editable.

export interface TemplateShape {
  kind: 'green' | 'water' | 'path' | 'floor' | 'building' | 'field' | 'track' | 'sand' | 'zone'
  shape?: 'rect' | 'ellipse' // default rect
  label?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
}

export interface VenueTemplate {
  key: string
  label: string
  category: string
  description: string
  canvas: { width: number; height: number }
  background: TemplateShape[]
}

const GREEN = '#3f7d4e'
const WATER = '#5b9bd5'
const PATH = '#d9cfa8'
const FLOOR = '#e8e3d8'
const BUILDING = '#c9c2b4'
const ZONE = '#cdd6e0'

export const VENUE_TEMPLATES: VenueTemplate[] = [
  {
    key: 'park',
    label: 'City park',
    category: 'outdoor',
    description: 'Open-air grounds with lawns, paths and a pond.',
    canvas: { width: 1200, height: 800 },
    background: [
      { kind: 'green', x: 0, y: 0, width: 1200, height: 800, color: GREEN },
      { kind: 'path', label: 'Main alley', x: 0, y: 370, width: 1200, height: 50, color: PATH },
      { kind: 'path', x: 570, y: 0, width: 50, height: 800, color: PATH },
      { kind: 'water', shape: 'ellipse', label: 'Pond', x: 840, y: 90, width: 260, height: 170, color: WATER },
      { kind: 'green', shape: 'ellipse', x: 120, y: 90, width: 180, height: 150, color: '#2f6b3e' },
      { kind: 'green', shape: 'ellipse', x: 180, y: 560, width: 220, height: 160, color: '#2f6b3e' },
      { kind: 'zone', label: 'Entrance', x: 540, y: 750, width: 110, height: 50, color: ZONE },
    ],
  },
  {
    key: 'sports_center',
    label: 'Sports center',
    category: 'indoor',
    description: 'Indoor hall with two courts and service rooms.',
    canvas: { width: 1200, height: 800 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 1120, height: 720, color: FLOOR },
      { kind: 'building', label: 'Locker rooms', x: 140, y: 60, width: 920, height: 80, color: BUILDING },
      { kind: 'field', label: 'Court A', x: 140, y: 200, width: 380, height: 480, color: '#7da7d9' },
      { kind: 'field', label: 'Court B', x: 680, y: 200, width: 380, height: 480, color: '#7da7d9' },
      { kind: 'zone', label: 'Lobby', x: 40, y: 700, width: 1120, height: 60, color: ZONE },
    ],
  },
  {
    key: 'stadium',
    label: 'Stadium',
    category: 'outdoor',
    description: 'Stands ring, running track and central field.',
    canvas: { width: 1400, height: 1000 },
    background: [
      { kind: 'building', shape: 'ellipse', label: 'Stands', x: 40, y: 40, width: 1320, height: 920, color: BUILDING },
      { kind: 'track', shape: 'ellipse', x: 170, y: 150, width: 1060, height: 700, color: '#c2603f' },
      { kind: 'field', label: 'Field', x: 380, y: 300, width: 640, height: 400, color: GREEN },
      { kind: 'zone', label: 'Gate A', x: 660, y: 950, width: 90, height: 40, color: ZONE },
    ],
  },
  {
    key: 'fair_pavilion',
    label: 'Fair pavilion',
    category: 'indoor',
    description: 'Large exhibition hall with aisles and a loading dock.',
    canvas: { width: 1400, height: 900 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 1320, height: 820, color: FLOOR },
      { kind: 'path', label: 'Aisle 1', x: 40, y: 300, width: 1320, height: 50, color: PATH },
      { kind: 'path', label: 'Aisle 2', x: 40, y: 560, width: 1320, height: 50, color: PATH },
      { kind: 'building', label: 'Loading dock', x: 1260, y: 340, width: 100, height: 220, color: BUILDING },
      { kind: 'zone', label: 'Entrance', x: 620, y: 820, width: 140, height: 40, color: ZONE },
    ],
  },
  {
    key: 'club',
    label: 'Club / live venue',
    category: 'indoor',
    description: 'Dance floor, DJ booth and bar counter.',
    canvas: { width: 1000, height: 700 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 920, height: 620, color: '#2e2a33' },
      { kind: 'zone', label: 'Dance floor', x: 320, y: 230, width: 360, height: 280, color: '#534a63' },
      { kind: 'building', label: 'DJ booth', x: 400, y: 80, width: 200, height: 100, color: BUILDING },
      { kind: 'building', label: 'Bar counter', x: 60, y: 200, width: 80, height: 320, color: BUILDING },
      { kind: 'zone', label: 'Lobby', x: 760, y: 580, width: 200, height: 80, color: ZONE },
    ],
  },
  {
    key: 'theater',
    label: 'Theater',
    category: 'indoor',
    description: 'Stage house, orchestra and seating bowl.',
    canvas: { width: 1100, height: 800 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 1020, height: 720, color: FLOOR },
      { kind: 'building', label: 'Stage house', x: 250, y: 60, width: 600, height: 180, color: BUILDING },
      { kind: 'zone', label: 'Orchestra', x: 250, y: 250, width: 600, height: 50, color: ZONE },
      { kind: 'zone', label: 'Seating', x: 200, y: 330, width: 700, height: 360, color: '#b9a0a8' },
      { kind: 'path', label: 'Lobby', x: 40, y: 710, width: 1020, height: 50, color: PATH },
    ],
  },
  {
    key: 'gallery',
    label: 'Gallery / museum',
    category: 'indoor',
    description: 'Exhibition rooms connected by a corridor.',
    canvas: { width: 1200, height: 800 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 1120, height: 720, color: '#f0ece4' },
      { kind: 'zone', label: 'Room 1', x: 60, y: 60, width: 540, height: 320, color: ZONE },
      { kind: 'zone', label: 'Room 2', x: 640, y: 60, width: 500, height: 320, color: ZONE },
      { kind: 'path', label: 'Corridor', x: 60, y: 390, width: 1080, height: 50, color: PATH },
      { kind: 'zone', label: 'Room 3', x: 60, y: 450, width: 1080, height: 290, color: ZONE },
    ],
  },
  {
    key: 'city_square',
    label: 'City square',
    category: 'outdoor',
    description: 'Paved square with a central fountain.',
    canvas: { width: 1200, height: 900 },
    background: [
      { kind: 'floor', x: 0, y: 0, width: 1200, height: 900, color: '#d8d2c6' },
      { kind: 'path', label: 'Street', x: 0, y: 0, width: 1200, height: 70, color: '#b3aca0' },
      { kind: 'path', label: 'Street', x: 0, y: 830, width: 1200, height: 70, color: '#b3aca0' },
      { kind: 'water', shape: 'ellipse', label: 'Fountain', x: 520, y: 380, width: 160, height: 160, color: WATER },
      { kind: 'building', label: 'Portico', x: 0, y: 90, width: 80, height: 720, color: BUILDING },
    ],
  },
  {
    key: 'beach',
    label: 'Beach',
    category: 'outdoor',
    description: 'Sand strip with boardwalk and sea front.',
    canvas: { width: 1200, height: 800 },
    background: [
      { kind: 'sand', x: 0, y: 0, width: 1200, height: 520, color: '#e7d8a8' },
      { kind: 'path', label: 'Boardwalk', x: 0, y: 520, width: 1200, height: 60, color: '#b08a5a' },
      { kind: 'water', label: 'Sea', x: 0, y: 580, width: 1200, height: 220, color: WATER },
    ],
  },
  {
    key: 'garden',
    label: 'Historic garden',
    category: 'outdoor',
    description: 'Formal lawns, hedges and a central fountain.',
    canvas: { width: 1200, height: 800 },
    background: [
      { kind: 'green', x: 0, y: 0, width: 1200, height: 800, color: '#4d8a57' },
      { kind: 'path', x: 0, y: 375, width: 1200, height: 50, color: '#cbb98e' },
      { kind: 'path', x: 575, y: 0, width: 50, height: 800, color: '#cbb98e' },
      { kind: 'green', label: 'Hedge', x: 80, y: 80, width: 440, height: 30, color: '#2f6b3e' },
      { kind: 'green', label: 'Hedge', x: 680, y: 690, width: 440, height: 30, color: '#2f6b3e' },
      { kind: 'water', shape: 'ellipse', label: 'Fountain', x: 530, y: 330, width: 140, height: 140, color: WATER },
    ],
  },
  {
    key: 'ballroom',
    label: 'Ballroom / banquet hall',
    category: 'indoor',
    description: 'Elegant hall with a stage strip and colonnade.',
    canvas: { width: 1100, height: 750 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 1020, height: 670, color: '#efe6d8' },
      { kind: 'building', label: 'Stage', x: 350, y: 60, width: 400, height: 120, color: BUILDING },
      { kind: 'building', shape: 'ellipse', x: 120, y: 200, width: 40, height: 40, color: '#bdb29f' },
      { kind: 'building', shape: 'ellipse', x: 120, y: 500, width: 40, height: 40, color: '#bdb29f' },
      { kind: 'building', shape: 'ellipse', x: 940, y: 200, width: 40, height: 40, color: '#bdb29f' },
      { kind: 'building', shape: 'ellipse', x: 940, y: 500, width: 40, height: 40, color: '#bdb29f' },
    ],
  },
  {
    key: 'warehouse',
    label: 'Industrial warehouse',
    category: 'indoor',
    description: 'Raw industrial hall with mezzanine and dock doors.',
    canvas: { width: 1300, height: 850 },
    background: [
      { kind: 'floor', x: 40, y: 40, width: 1220, height: 770, color: '#cfcdc8' },
      { kind: 'building', label: 'Mezzanine', x: 40, y: 40, width: 1220, height: 140, color: BUILDING },
      { kind: 'building', label: 'Dock doors', x: 1180, y: 300, width: 80, height: 400, color: '#a39e94' },
      { kind: 'building', x: 420, y: 420, width: 30, height: 30, color: '#a39e94' },
      { kind: 'building', x: 860, y: 420, width: 30, height: 30, color: '#a39e94' },
    ],
  },
]

export function getVenueTemplate(key: string): VenueTemplate | null {
  return VENUE_TEMPLATES.find((t) => t.key === key) ?? null
}
