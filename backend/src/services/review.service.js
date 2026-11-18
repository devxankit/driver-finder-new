/**
 * Google Play review accounts (REVIEW_DRIVER_PHONE / REVIEW_OWNER_PHONE in .env).
 *
 * Reviewers sign in with the phone number and TEST_OTP_CODE (no SMS is sent).
 * On every sign-in the account is put back into a ready-to-use state, so the
 * whole app can be tested even if a previous reviewer deleted the account,
 * left the profile half done or let the plan run out:
 *   role and profile, registration paid, KYC approved (placeholder documents),
 *   an active plan, not suspended.
 * Only missing pieces are filled in; what the reviewer changed is kept.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { REQUIRED_DOCS } from '../models/User.js'
import { Document, Subscription } from '../models/index.js'
import { uploadRoot } from '../middleware/upload.js'
import { DAY_MS } from '../utils/helpers.js'

/** A "SAMPLE DOCUMENT" picture, so reviewers can open My documents and see a photo. */
const PLACEHOLDER = 'private/review-sample-doc.jpg'
const SAMPLE_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../seed-assets/review-sample-doc.jpg')
/** Earlier placeholders, replaced on the next sign-in. */
const OLD_PLACEHOLDER = 'private/review-sample.txt'
/** Real-looking names: English words like "Play Review" were machine-translated into nonsense. */
const NAMES = { driver: 'Ravi Kumar', owner: 'Suresh Sharma' }
const COMPANY = 'Sharma Roadlines'
const OLD_NAMES = ['Play Review Driver', 'Play Review Owner']

/** 'driver' / 'owner' for a review number, else null. */
export function reviewRole(phone) {
  if (phone && phone === env.review.driverPhone) return 'driver'
  if (phone && phone === env.review.ownerPhone) return 'owner'
  return null
}

export const isReviewPhone = (phone) => Boolean(reviewRole(phone))

/** Makes the user a ready review account. `user` is a Mongoose document. */
export async function prepareReviewAccount(user) {
  const role = reviewRole(user.phone)
  if (!role) return user

  user.set({ deletedAt: undefined, status: 'active', suspendReason: '', role })
  if (!user.name || OLD_NAMES.includes(user.name)) user.name = NAMES[role]
  if (!user.city) user.city = 'Mumbai'
  if (role === 'driver' && !user.driver?.categories?.length) {
    user.driver = { categories: ['truck', 'tempo'], licence: ['HMV'], experience: 5, payPref: 'both', expectedPay: '20000', fullTime: true, languages: 'Hindi, English', about: 'Google Play review account.', preferredLocations: ['Mumbai'] }
  }
  if (role === 'owner' && !user.owner?.type) user.owner = { company: COMPANY, type: 'fleet' }
  if (role === 'owner' && user.owner?.company === 'Play Review Transport') user.owner.company = COMPANY
  user.profileDone = true
  if (!user.registration?.paid) user.registration = { paid: true, paidAt: new Date() }
  if (user.kyc?.status !== 'approved') user.kyc = { status: 'approved', reason: '', submittedAt: new Date(), reviewedAt: new Date() }
  await user.save()

  // Placeholder KYC documents, so the profile shows as verified everywhere.
  const file = path.join(uploadRoot, PLACEHOLDER)
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.copyFileSync(SAMPLE_SRC, file)
  }
  await Document.updateMany({ user: user._id, file: OLD_PLACEHOLDER }, { file: PLACEHOLDER, mime: 'image/jpeg' })
  const have = await Document.find({ user: user._id }).distinct('key')
  const missing = (REQUIRED_DOCS[role] ?? []).filter((k) => !have.includes(k))
  if (missing.length) {
    await Document.insertMany(missing.map((key) => ({ user: user._id, key, file: PLACEHOLDER, mime: 'image/jpeg', status: 'approved' })))
  }

  // A plan that never runs out during a review (topped up to a year).
  const active = await Subscription.findOne({ user: user._id, role, expiresAt: { $gt: new Date(Date.now() + 30 * DAY_MS) } }).lean()
  if (!active) {
    await Subscription.create({ user: user._id, role, planName: 'Play review', startsAt: new Date(), expiresAt: new Date(Date.now() + 365 * DAY_MS), source: 'admin', note: 'Google Play review account' })
  }
  return user
}
