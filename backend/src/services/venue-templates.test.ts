import { describe, expect, it } from 'vitest'
import { VENUE_TEMPLATES, getVenueTemplate } from './venue-templates.js'

describe('venue templates', () => {
  it('covers at least 11 location categories with unique keys', () => {
    expect(VENUE_TEMPLATES.length).toBeGreaterThanOrEqual(11)
    const keys = VENUE_TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every template has a valid canvas and a non-empty background', () => {
    for (const t of VENUE_TEMPLATES) {
      expect(t.canvas.width).toBeGreaterThan(0)
      expect(t.canvas.height).toBeGreaterThan(0)
      expect(t.background.length).toBeGreaterThan(0)
      for (const shape of t.background) {
        expect(shape.width).toBeGreaterThan(0)
        expect(shape.height).toBeGreaterThan(0)
        expect(shape.x).toBeGreaterThanOrEqual(0)
        expect(shape.y).toBeGreaterThanOrEqual(0)
        expect(shape.x + shape.width).toBeLessThanOrEqual(t.canvas.width)
        expect(shape.y + shape.height).toBeLessThanOrEqual(t.canvas.height)
      }
    }
  })

  it('looks templates up by key', () => {
    expect(getVenueTemplate('park')?.label).toBe('City park')
    expect(getVenueTemplate('nope')).toBeNull()
  })
})
