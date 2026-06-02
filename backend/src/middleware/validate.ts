import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Validates req.body against a zod schema and replaces it with the parsed
// (typed, stripped) result. Responds 400 with field-level details on failure.
export function validateBody<T>(schema: z.ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: result.error.issues.map((i) => ({
                    path: i.path.join('.'),
                    message: i.message,
                })),
            })
        }
        req.body = result.data
        next()
    }
}
