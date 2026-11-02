import multer from 'multer'
import { env, isProduction } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Last middleware in app.js. Every error leaves as
 *   { success: false, message, code?, fieldErrors? }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = 500
  let message = 'Something went wrong. Please try again.'
  let fieldErrors
  let code

  if (err instanceof ApiError) {
    statusCode = err.statusCode
    message = err.message
    fieldErrors = err.fieldErrors
    code = err.code
  } else if (err instanceof multer.MulterError) {
    statusCode = 422
    code = err.code
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. Maximum size is ${Math.round(env.upload.maxFileSizeBytes / (1024 * 1024))} MB.`
        : 'That file could not be accepted.'
  } else if (err.name === 'ValidationError') {
    statusCode = 422
    code = 'VALIDATION_FAILED'
    message = 'Please correct the highlighted fields.'
    fieldErrors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
  } else if (err.code === 11000) {
    statusCode = 409
    code = 'DUPLICATE'
    message = 'This already exists.'
  } else if (err.type === 'entity.too.large') {
    statusCode = 413
    message = 'That request was too large.'
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400
    message = 'Invalid JSON body.'
  }

  if (statusCode >= 500) console.error('[error]', err)

  res.status(statusCode).json({
    success: false,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(code ? { code } : {}),
    ...(isProduction || statusCode < 500 ? {} : { stack: err.stack }),
  })
}

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, { code: 'NOT_FOUND' }))
}
