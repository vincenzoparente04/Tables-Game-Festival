import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import multer, { MulterError } from 'multer'
import { requireActivatedAccount, requirePermission } from '../middleware/roles.js'
import { AppError } from '../middleware/error-handler.js'
import { parseOptionalIntQuery } from './helpers.js'
import { isCloudinaryEnabled, uploadImage } from '../services/uploads.service.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true)
    cb(new AppError(400, 'Only image uploads are allowed'))
  },
})

// Reject before parsing the multipart body when uploads are not configured.
function requireCloudinary(_req: Request, _res: Response, next: NextFunction) {
  if (!isCloudinaryEnabled()) {
    return next(new AppError(503, 'Image uploads are not configured (CLOUDINARY_URL is missing)'))
  }
  next()
}

router.post(
  '/',
  requireActivatedAccount(),
  requirePermission('uploads', 'create'),
  requireCloudinary,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) throw new AppError(400, 'Missing "file" form field')
    const eventId = parseOptionalIntQuery(req.query.event_id)
    const folder = `event-platform/${eventId ?? 'misc'}`
    res.status(201).json(await uploadImage(req.file.buffer, folder))
  },
)

// Multer errors (size limit, unexpected field) become 400s instead of 500s.
router.use((err: unknown, _req: Request, _res: Response, next: NextFunction) => {
  if (err instanceof MulterError) return next(new AppError(400, `Upload rejected: ${err.message}`))
  next(err)
})

export default router
