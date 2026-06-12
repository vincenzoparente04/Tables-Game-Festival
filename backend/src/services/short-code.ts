import { randomInt } from 'node:crypto'

// Unambiguous, URL/print-friendly alphabet (no 0/O, 1/I/L, U/V confusion).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'

// Crypto-random short code for order/ticket lookups. 10 chars ≈ 8·10^14
// combinations — unguessable and unenumerable behind the public rate limiter.
export function shortCode(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]!
  }
  return out
}
