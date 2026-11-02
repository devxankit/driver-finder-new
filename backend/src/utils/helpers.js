import mongoose from 'mongoose'
import { ApiError } from './ApiError.js'

export const DAY_MS = 24 * 60 * 60 * 1000

/** Throws a 404 unless `id` is a valid ObjectId (avoids CastErrors becoming 500s). */
export function assertId(id, what = 'Item') {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound(`${what} not found.`)
  return id
}

/** Page/limit from the query string, clamped. */
export function paging(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Case-insensitive "contains" regex for search boxes. */
export const like = (s) => new RegExp(escapeRegex(String(s).trim()), 'i')

/** Indian mobile numbers: 10 digits starting 6-9. Accepts +91 / 0 prefixes. */
export function normalisePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  const ten = digits.length > 10 ? digits.slice(-10) : digits
  return /^[6-9]\d{9}$/.test(ten) ? ten : null
}

/** Runs a paginated find and returns { items, total, page, pages }. */
export async function paginate(model, filter, { page, limit, skip }, { sort = { createdAt: -1 }, populate, select } = {}) {
  let q = model.find(filter).sort(sort).skip(skip).limit(limit)
  if (populate) q = q.populate(populate)
  if (select) q = q.select(select)
  const [items, total] = await Promise.all([q.lean(), model.countDocuments(filter)])
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) }
}
