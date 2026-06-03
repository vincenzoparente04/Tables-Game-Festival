import type { Request, Response, NextFunction } from 'express'

// Application error with an explicit HTTP status. Throw this from any handler
// (Express 5 forwards thrown/rejected errors to the error handler automatically).
export class AppError extends Error {
    status: number
    constructor(status: number, message: string) {
        super(message)
        this.name = 'AppError'
        this.status = status
    }
}

// Catch-all for unmatched routes. Register after all routes.
export function notFound(_req: Request, res: Response) {
    res.status(404).json({ error: 'Not found' })
}

// Maps common PostgreSQL error codes to HTTP responses.
const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
    '23505': { status: 409, message: 'Resource already exists' }, // unique_violation
    '23503': { status: 400, message: 'Invalid reference' }, // foreign_key_violation
    '23514': { status: 400, message: 'Value violates a constraint' }, // check_violation
    '22P02': { status: 400, message: 'Invalid input syntax' }, // invalid_text_representation
}

function pgErrorCode(err: unknown): string | undefined {
    if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code?: unknown }).code
        return typeof code === 'string' ? code : undefined
    }
    return undefined
}

// Central error handler. Must be registered last and take 4 arguments so that
// Express recognises it as an error-handling middleware.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (res.headersSent) return
    if (err instanceof AppError) {
        return res.status(err.status).json({ error: err.message })
    }
    const mapped = PG_ERROR_MAP[pgErrorCode(err) ?? '']
    if (mapped) {
        return res.status(mapped.status).json({ error: mapped.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
}
