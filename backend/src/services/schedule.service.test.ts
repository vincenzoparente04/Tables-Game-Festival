import { describe, expect, it } from 'vitest'
import { findConflicts } from './schedule.service.js'
import type { ConflictCheckSlot } from './schedule.service.js'

const slot = (
  over: Partial<ConflictCheckSlot> & Pick<ConflictCheckSlot, 'starts_at' | 'ends_at'>,
): ConflictCheckSlot => ({
  title: 'Existing slot',
  area_id: null,
  artist_id: null,
  status: 'confirmed',
  ...over,
})

describe('findConflicts', () => {
  it('warns on a same-area time overlap', () => {
    const existing = [slot({ area_id: 1, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    const warnings = findConflicts(
      slot({ area_id: 1, starts_at: '2026-07-01T21:00:00Z', ends_at: '2026-07-01T23:00:00Z', title: 'New' }),
      existing,
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('same area')
  })

  it('does not warn when slots only touch at the edges', () => {
    const existing = [slot({ area_id: 1, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    expect(
      findConflicts(slot({ area_id: 1, starts_at: '2026-07-01T22:00:00Z', ends_at: '2026-07-01T23:00:00Z' }), existing),
    ).toEqual([])
  })

  it('does not warn across different areas without a shared artist', () => {
    const existing = [slot({ area_id: 1, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    expect(
      findConflicts(slot({ area_id: 2, starts_at: '2026-07-01T20:30:00Z', ends_at: '2026-07-01T21:30:00Z' }), existing),
    ).toEqual([])
  })

  it('warns when the same artist overlaps on another stage', () => {
    const existing = [slot({ area_id: 1, artist_id: 9, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    const warnings = findConflicts(
      slot({ area_id: 2, artist_id: 9, starts_at: '2026-07-01T21:00:00Z', ends_at: '2026-07-01T23:00:00Z' }),
      existing,
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Artist')
  })

  it('reports both warnings for same area AND same artist', () => {
    const existing = [slot({ area_id: 1, artist_id: 9, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    expect(
      findConflicts(
        slot({ area_id: 1, artist_id: 9, starts_at: '2026-07-01T21:00:00Z', ends_at: '2026-07-01T21:30:00Z' }),
        existing,
      ),
    ).toHaveLength(2)
  })

  it('ignores cancelled slots on either side', () => {
    const existing = [
      slot({ area_id: 1, status: 'cancelled', starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' }),
    ]
    expect(
      findConflicts(slot({ area_id: 1, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' }), existing),
    ).toEqual([])
    const active = [slot({ area_id: 1, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    expect(
      findConflicts(
        slot({ area_id: 1, status: 'cancelled', starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' }),
        active,
      ),
    ).toEqual([])
  })

  it('excludes the slot itself when updating', () => {
    const existing = [slot({ id: 7, area_id: 1, starts_at: '2026-07-01T20:00:00Z', ends_at: '2026-07-01T22:00:00Z' })]
    expect(
      findConflicts(
        slot({ id: 7, area_id: 1, starts_at: '2026-07-01T20:30:00Z', ends_at: '2026-07-01T22:00:00Z' }),
        existing,
      ),
    ).toEqual([])
  })
})
