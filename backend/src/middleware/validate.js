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
