// Element-kind metadata shared by the editor palette, the canvas renderer and
// the public read-only map: default size/color and base shape per kind. The
// visual glyph itself is drawn as inline SVG by map-canvas / map-glyph.

export interface ElementKindMeta {
  kind: string
  label: string
  width: number
  height: number
  color: string
  shape: 'rect' | 'ellipse'
}

export const ELEMENT_KIND_META: ElementKindMeta[] = [
  { kind: 'stage', label: 'Stage', width: 220, height: 120, color: '#3e7bfa', shape: 'rect' },
  { kind: 'stand', label: 'Stand', width: 80, height: 60, color: '#8b5cf6', shape: 'rect' },
  { kind: 'booth', label: 'Booth', width: 100, height: 80, color: '#6366f1', shape: 'rect' },
  { kind: 'table', label: 'Table', width: 60, height: 40, color: '#5b8efb', shape: 'rect' },
  { kind: 'bar', label: 'Bar', width: 140, height: 60, color: '#f59e2c', shape: 'rect' },
  { kind: 'food', label: 'Food', width: 120, height: 60, color: '#f2c53d', shape: 'rect' },
  { kind: 'seating', label: 'Seating', width: 160, height: 100, color: '#6d5cf6', shape: 'rect' },
  { kind: 'entrance', label: 'Entrance', width: 80, height: 34, color: '#4bcd79', shape: 'rect' },
  { kind: 'exit', label: 'Exit', width: 80, height: 34, color: '#ef5d5d', shape: 'rect' },
  { kind: 'wc', label: 'WC', width: 60, height: 50, color: '#3fc7c7', shape: 'rect' },
  { kind: 'info', label: 'Info point', width: 60, height: 50, color: '#5b8efb', shape: 'rect' },
  { kind: 'decor', label: 'Decor', width: 70, height: 70, color: '#4bcd79', shape: 'ellipse' },
  { kind: 'custom', label: 'Custom', width: 90, height: 60, color: '#9b8cff', shape: 'rect' },
]

const FALLBACK = ELEMENT_KIND_META[ELEMENT_KIND_META.length - 1]!

export function kindMeta(kind: string): ElementKindMeta {
  return ELEMENT_KIND_META.find((m) => m.kind === kind) ?? FALLBACK
}

// Editor-side element shape: negative ids mark elements not yet persisted
// (the bulk-replace save reissues all ids anyway).
export interface EditorElement {
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
  area_id: number | null
  resource_id: number | null
  booking_id: number | null
  booking_participant_name?: string | null
  resource_label?: string | null
  area_name?: string | null
}

// Decorative template/background shape (stored as JSONB on the map).
export interface BackgroundShape {
  kind?: string
  shape?: string
  label?: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
}

export function snap(value: number, grid: number): number {
  return grid > 0 ? Math.round(value / grid) * grid : value
}
