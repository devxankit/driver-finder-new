/**
 * Error carrying an HTTP status, a stable machine-readable code the clients
 * branch on (e.g. KYC_REQUIRED, PLAN_REQUIRED), and optional per-field messages.
 */
export class ApiError extends Error {
  constructor(statusCode, message, { fieldErrors, code } = {}) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.fieldErrors = fieldErrors
    this.code = code
    Error.captureStackTrace?.(this, ApiError)
  }

  static badRequest(message, code) {
    return new ApiError(400, message, { code })
  }

  static unauthorized(message = 'Please sign in again.', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, { code })
  }

  static forbidden(message = 'You are not allowed to do this.', code = 'FORBIDDEN') {
    return new ApiError(403, message, { code })
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, message, { code: 'NOT_FOUND' })
  }

  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, { code })
  }

  static validation(message, fieldErrors) {
    return new ApiError(422, message, { fieldErrors, code: 'VALIDATION_FAILED' })
  }

  static tooManyRequests(message) {
    return new ApiError(429, message, { code: 'RATE_LIMITED' })
  }
}
