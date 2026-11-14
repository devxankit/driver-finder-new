import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { env, isProduction } from '../config/env.js'
import { normalisePhone } from '../utils/helpers.js'
import { isReviewPhone } from '../services/review.service.js'

/**
 * Indian mobile carriers put thousands of phones behind one public IP (CGNAT),
 * so limits that real users can reach are counted per phone number or per
 * signed-in user. Per-IP limits stay only as a loose cap on scripts.
 */

const json = (message) => ({ success: false, message, code: 'RATE_LIMITED' })
const common = { standardHeaders: 'draft-8', legacyHeaders: false }
const byIp = (req) => ipKeyGenerator(req.ip)
/** Google Play review numbers: several reviewers may sign in with them. */
const reviewNumber = (req) => isReviewPhone(normalisePhone(req.body?.phone))
const byPhone = (req) => `phone:${normalisePhone(req.body?.phone) ?? String(req.body?.phone ?? '').slice(0, 20)}`

/** The signed-in user (verified token) or else the IP. */
function byUserOrIp(req) {
  const h = req.headers.authorization
  if (h?.startsWith('Bearer ')) {
    try {
      const { id, kind } = jwt.verify(h.slice(7), env.jwtSecret)
      if (id) return `${kind}:${id}`
    } catch {
      // invalid token: counted by IP
    }
  }
  return byIp(req)
}

/** Whole API: generous, it only blunts scripted abuse. */
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: byUserOrIp,
  message: json('Too many requests. Please slow down.'),
})

/** OTP SMS cost money: at most 5 per number per hour (the 30 s resend gap applies too). */
export const otpPhoneLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: isProduction ? 5 : 100,
  keyGenerator: byPhone,
  skip: reviewNumber,
  message: json('Too many OTP requests for this number. Please try again after an hour.'),
})

/** Loose per-IP cap on OTP requests (many real users can share one carrier IP). */
export const otpIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 100 : 500,
  keyGenerator: byIp,
  message: json('Too many OTP requests. Please try again after some time.'),
})

/** OTP checks per number (each code also locks after 5 wrong tries). */
export const verifyLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 15,
  keyGenerator: byPhone,
  skip: reviewNumber,
  message: json('Too many login attempts. Please try again after some time.'),
})

/** Admin panel login (few admins, one office IP). */
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: byIp,
  message: json('Too many login attempts. Please try again after some time.'),
})

/** Landing-page contact form. */
export const enquiryLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: byIp,
  message: json('Too many messages. Please try again later or call us.'),
})

/** Translation batches: a busy screen sends a few; this only stops scripted abuse of the translator. */
export const translateLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 90,
  keyGenerator: byUserOrIp,
  message: json('Too many translation requests. Please slow down.'),
})
