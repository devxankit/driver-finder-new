import { Subscription } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'

/** The user's current subscription for their role, or null. */
export function activeSubscription(user) {
  if (!user.role) return null
  return Subscription.findOne({ user: user._id, role: user.role, expiresAt: { $gt: new Date() } })
    .sort({ expiresAt: -1 })
    .lean()
}

/**
 * Paid actions (apply, send/accept a hiring request, connect, chat, see a
 * phone number) need approved KYC and an active plan. The app opens the KYC
 * sheet or the paywall based on the error code.
 */
export async function assertCanConnect(user) {
  assertRegistered(user)
  if (user.kyc?.status !== 'approved') {
    throw ApiError.forbidden(
      user.kyc?.status === 'pending'
        ? 'Your documents are being checked. You can do this once they are approved.'
        : 'Please complete your KYC verification first.',
      'KYC_REQUIRED'
    )
  }
  const sub = await activeSubscription(user)
  if (!sub) throw ApiError.forbidden('Please buy a plan to continue.', 'PLAN_REQUIRED')
  return sub
}

/** The one-time registration fee must be paid before anything else. */
export function assertRegistered(user) {
  if (!user.registration?.paid) throw ApiError.forbidden('Please complete registration first.', 'REGISTRATION_REQUIRED')
}

/** Posting jobs only needs approved KYC (posting is free; connecting is paid). */
export function assertKycApproved(user) {
  assertRegistered(user)
  if (user.kyc?.status !== 'approved') {
    throw ApiError.forbidden('Please complete your KYC verification first.', 'KYC_REQUIRED')
  }
}
