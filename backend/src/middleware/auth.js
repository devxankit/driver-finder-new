import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import User from '../models/User.js'
import { Admin } from '../models/index.js'

/** App tokens and admin tokens share the secret but carry a different `kind`, so neither works as the other. */
export const signUserToken = (user) => jwt.sign({ id: String(user._id), kind: 'user' }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })

export const signAdminToken = (admin) => jwt.sign({ id: String(admin._id), kind: 'admin' }, env.jwtSecret, { expiresIn: env.adminJwtExpiresIn })

function readToken(req, kind) {
  const header = req.headers.authorization
  let token = header?.startsWith('Bearer ') ? header.slice(7) : null
  // Admin <img> tags for private KYC files cannot send headers, so they pass ?token=.
  if (!token && kind === 'admin' && req.query.token) token = String(req.query.token)
  if (!token) throw ApiError.unauthorized('Please sign in.', 'UNAUTHORIZED')

  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.', 'INVALID_TOKEN')
  }
  if (payload.kind !== kind) throw ApiError.unauthorized('Please sign in.', 'INVALID_TOKEN')
  return payload
}

/** Signed-in app user (driver or owner). Suspended or deleted accounts are signed out. */
export async function protect(req, res, next) {
  const { id } = readToken(req, 'user')
  const user = await User.findById(id)
  if (!user || user.deletedAt) throw ApiError.unauthorized('Account not found. Please sign in again.', 'USER_NOT_FOUND')
  if (user.status === 'suspended') {
    throw ApiError.forbidden(
      user.suspendReason ? `Your account is suspended: ${user.suspendReason}` : 'Your account is suspended. Please contact support.',
      'ACCOUNT_SUSPENDED'
    )
  }
  req.user = user
  // Cheap "last seen" without a write on every request.
  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > 10 * 60 * 1000) {
    User.updateOne({ _id: user._id }, { lastSeenAt: new Date() }).catch(() => {})
  }
  next()
}

/** Only drivers / only owners. */
export const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    throw ApiError.forbidden(role === 'driver' ? 'Only drivers can do this.' : 'Only vehicle owners can do this.', 'WRONG_ROLE')
  }
  next()
}

export async function protectAdmin(req, res, next) {
  const { id } = readToken(req, 'admin')
  const admin = await Admin.findById(id)
  if (!admin || !admin.active) throw ApiError.unauthorized('Admin account not found or disabled.', 'UNAUTHORIZED')
  req.admin = admin
  next()
}

export function requireSuper(req, res, next) {
  if (req.admin.role !== 'super') throw ApiError.forbidden('Only a super admin can do this.')
  next()
}
