import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET, shortCode } from './short-code.js'

describe('shortCode', () => {
  it('generates codes of the requested length from the safe alphabet', () => {
    for (const len of [4, 10, 12]) {
      const code = shortCode(len)
      expect(code).toHaveLength(len)
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch)
    }
  })

  it('does not collide over 10k draws at ticket length', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) seen.add(shortCode(12))
    expect(seen.size).toBe(10_000)
  })

  it('avoids ambiguous characters', () => {
    for (const ch of '01OILU') expect(CODE_ALPHABET).not.toContain(ch)
  })
})
