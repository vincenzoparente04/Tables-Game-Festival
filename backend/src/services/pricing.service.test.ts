import { describe, it, expect } from 'vitest'
import { calculateQuote } from './pricing.service.js'

describe('calculateQuote (pure pricing math)', () => {
  it('returns zeros for no items', () => {
    const q = calculateQuote([], 0)
    expect(q).toEqual({ subtotal: 0, discount: 0, total: 0, lines: [] })
  })

  it('computes a single line total', () => {
    const q = calculateQuote([{ label: 'Standard table', unit: 'table', quantity: 3, unit_price: 40 }], 0)
    expect(q.subtotal).toBe(120)
    expect(q.total).toBe(120)
    expect(q.lines).toHaveLength(1)
    expect(q.lines[0]).toMatchObject({ description: 'Standard table (table)', line_total: 120 })
  })

  it('sums multiple lines and applies the discount', () => {
    const q = calculateQuote(
      [
        { label: 'Table', unit: 'table', quantity: 3, unit_price: 40 },
        { label: 'Seat', unit: 'seat', quantity: 2, unit_price: 25 },
      ],
      10,
    )
    expect(q.subtotal).toBe(170)
    expect(q.discount).toBe(10)
    expect(q.total).toBe(160)
  })

  it('never goes below zero when the discount exceeds the subtotal', () => {
    const q = calculateQuote([{ label: 'X', unit: 'unit', quantity: 1, unit_price: 50 }], 80)
    expect(q.total).toBe(0)
  })

  it('rounds line and subtotal to 2 decimals', () => {
    const q = calculateQuote([{ label: 'X', unit: 'unit', quantity: 3, unit_price: 19.99 }], 0)
    expect(q.lines[0]!.line_total).toBe(59.97)
    expect(q.subtotal).toBe(59.97)
    expect(q.total).toBe(59.97)
  })
})
