import { ApiError } from '../utils/ApiError.js'

/**
 * Validates req.body against a Zod schema and replaces it with the parsed
 * result. Failures become a 422 with a { field: message } map; the top-level
 * message is the first field's message so mobile toasts are useful as-is.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      const fieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_form'
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      throw ApiError.validation(Object.values(fieldErrors)[0] || 'Please correct the highlighted fields.', fieldErrors)
    }
    req.body = result.data
    next()
  }
}

/**
 * For PATCH: like validate(), but keeps only the fields the client sent. Zod 4
 * fills .default() values even inside .partial(), so without this a PATCH of
 * { status: 'paused' } would blank every field that has a default.
 */
export function validatePatch(schema) {
  const check = validate(schema)
  return (req, res, next) => {
    const sent = new Set(Object.keys(req.body ?? {}))
    check(req, res, () => {
      req.body = Object.fromEntries(Object.entries(req.body).filter(([k]) => sent.has(k)))
      next()
    })
  }
}
