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

// Central error handler. Must be registered last and take 4 arguments so that
// Express recognises it as an error-handling middleware.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (res.headersSent) return
    if (err instanceof AppError) {
        return res.status(err.status).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
}
