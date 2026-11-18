import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Files are stored on the server disk for now.
 *   uploads/public  -> profile, vehicle and category images (served at /uploads)
 *   uploads/private -> KYC documents (streamed only to signed-in admins)
 */
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }

export const uploadRoot = path.resolve(env.upload.root)

function makeUploader(visibility, folder, mimeTypes, many = 0) {
  const m = multer({
    storage: multer.diskStorage({
      destination(req, file, cb) {
        const dir = path.join(uploadRoot, visibility, folder)
        fs.mkdirSync(dir, { recursive: true })
        cb(null, dir)
      },
      filename(req, file, cb) {
        cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype] || ''}`)
      },
    }),
    limits: { fileSize: env.upload.maxFileSizeBytes, files: many || 1, fields: 20 },
    fileFilter(req, file, cb) {
      if (mimeTypes.includes(file.mimetype)) cb(null, true)
      else cb(ApiError.validation('Upload a JPG, PNG or WebP image.', { file: 'Unsupported file type.' }))
    },
  })
  return many ? m.array('files', many) : m.single('file')
}

/** Most photos a vehicle can have; at least MIN_VEHICLE_PHOTOS are required. */
export const MAX_VEHICLE_PHOTOS = 8
export const MIN_VEHICLE_PHOTOS = 2

/** Path stored in the database, relative to the upload root, e.g. "public/photos/abc.jpg". */
export const storedPath = (file) => path.relative(uploadRoot, file.path).split(path.sep).join('/')

/** Public URL path for a stored public file ("/uploads/photos/abc.jpg"). */
export const publicUrl = (stored) => (stored ? `/uploads/${stored.replace(/^public\//, '')}` : null)

export const absolutePath = (stored) => path.join(uploadRoot, stored)

/** Shared sample files used by demo and Google Play review accounts: never deleted with one account. */
const SHARED = /^private\/(demo-sample|review-sample)/

export function removeStored(stored) {
  if (!stored || SHARED.test(stored)) return
  fs.promises.unlink(absolutePath(stored)).catch(() => {})
}

export const uploadPhoto = makeUploader('public', 'photos', env.upload.imageMimeTypes)
export const uploadVehiclePhoto = makeUploader('public', 'vehicles', env.upload.imageMimeTypes)
/** Several vehicle photos in one request (multipart field "files"). */
export const uploadVehiclePhotos = makeUploader('public', 'vehicles', env.upload.imageMimeTypes, MAX_VEHICLE_PHOTOS)
export const uploadCategoryImage = makeUploader('public', 'categories', env.upload.imageMimeTypes)
export const uploadKycDoc = makeUploader('private', 'kyc', env.upload.docMimeTypes)

/** Deletes the files of a request that ends in an error (e.g. a validation failure after upload). */
export function discardOnError(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode < 400) return
    const files = req.files ?? (req.file ? [req.file] : [])
    for (const f of Array.isArray(files) ? files : Object.values(files).flat()) fs.promises.unlink(f.path).catch(() => {})
  })
  next()
}

export function requireFile(req, res, next) {
  if (!req.file) throw ApiError.validation('Please attach a file.', { file: 'File is required.' })
  next()
}
