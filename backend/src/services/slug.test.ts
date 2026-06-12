import { describe, expect, it } from 'vitest'
import { generateUniqueSlug, slugify } from './slug.js'

describe('slugify', () => {
  it('lowercases, strips diacritics and symbols', () => {
    expect(slugify('Città di Notte! 2026')).toBe('citta-di-notte-2026')
  })

  it('collapses separators and trims dashes', () => {
    expect(slugify('  --Art & Wine — Expo--  ')).toBe('art-wine-expo')
  })

  it('returns an empty string for symbol-only input', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('generateUniqueSlug', () => {
  it('returns the base slug when free', async () => {
    expect(await generateUniqueSlug('Jazz Nights', async () => false)).toBe('jazz-nights')
  })

  it('appends -2, -3, ... on collisions', async () => {
    const taken = new Set(['jazz-nights', 'jazz-nights-2'])
    expect(await generateUniqueSlug('Jazz Nights', async (s) => taken.has(s))).toBe('jazz-nights-3')
  })

  it('falls back to "event" for empty bases', async () => {
    expect(await generateUniqueSlug('!!!', async () => false)).toBe('event')
  })
})
