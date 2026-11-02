import rateLimit from 'express-rate-limit'
import { isProduction } from '../config/env.js'

const json = (message) => ({ success: false, message, code: 'RATE_LIMITED' })

/** Whole API: generous, it only blunts scripted abuse. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: json('Too many requests. Please slow down.'),
})

/** OTP requests cost money (SMS), so they are limited per IP (looser while developing). */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: json('Too many OTP requests. Please try again after some time.'),
})

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: json('Too many login attempts. Please try again after some time.'),
})
