// URL-safe slugs for public event pages.

// 'Città di Notte! 2026' -> 'citta-di-notte-2026'
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Appends -2, -3, ... until `exists` reports the candidate as free.
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'event'
  let candidate = root
  for (let n = 2; await exists(candidate); n++) {
    candidate = `${root}-${n}`
  }
  return candidate
}
