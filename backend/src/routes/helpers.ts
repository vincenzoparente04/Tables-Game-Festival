import { AppError } from '../middleware/error-handler.js'

// Parses a required positive integer route parameter.
export function parseId(raw: string | undefined): number {
    const id = Number(raw)
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid id')
    return id
}

// Parses an optional positive integer query parameter (e.g. ?event_id=).
export function parseOptionalIntQuery(raw: unknown): number | undefined {
    if (raw === undefined) return undefined
    const n = Number(raw)
    if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'Invalid query parameter')
    return n
}
