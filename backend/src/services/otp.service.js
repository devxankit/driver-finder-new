import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { Otp } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { sendSms } from './sms.service.js'

const hash = (phone, code) => crypto.createHmac('sha256', env.jwtSecret).update(`${phone}:${code}`).digest('hex')

const randomCode = () => String(crypto.randomInt(0, 10 ** env.otp.length)).padStart(env.otp.length, '0')

const isTestNumber = (phone) => env.otp.testCode && env.otp.testNumbers.includes(phone)

/**
 * Creates an OTP for `phone`.
 *
 * OTP_ENABLED=true  -> the code is sent by SMS and never returned.
 * OTP_ENABLED=false -> no SMS; the code is returned as `devOtp` so the app can
 *                      fill it in by itself.
 */
export async function requestOtp(phone) {
  const recent = await Otp.findOne({ phone }).sort({ createdAt: -1 })
  if (recent && Date.now() - recent.createdAt.getTime() < env.otp.resendSeconds * 1000) {
    const wait = Math.ceil((env.otp.resendSeconds * 1000 - (Date.now() - recent.createdAt.getTime())) / 1000)
    throw ApiError.tooManyRequests(`Please wait ${wait} seconds before asking for a new OTP.`)
  }

  const code = isTestNumber(phone) ? env.otp.testCode : randomCode()
  await Otp.deleteMany({ phone })
  await Otp.create({
    phone,
    codeHash: hash(phone, code),
    expiresAt: new Date(Date.now() + env.otp.ttlMinutes * 60 * 1000),
  })

  if (env.otp.enabled && !isTestNumber(phone)) {
    await sendSms(phone, env.smsIndiaHub.message.replace('{otp}', code))
    return { sent: true, resendIn: env.otp.resendSeconds }
  }
  return { sent: false, devOtp: code, resendIn: env.otp.resendSeconds }
}

/** Checks the code; throws a friendly error when wrong, expired or over-tried. */
export async function verifyOtp(phone, code) {
  const otp = await Otp.findOne({ phone }).sort({ createdAt: -1 })
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('This OTP has expired. Please ask for a new one.', 'OTP_EXPIRED')
  }
  if (otp.attempts >= env.otp.maxAttempts) {
    await otp.deleteOne()
    throw ApiError.badRequest('Too many wrong tries. Please ask for a new OTP.', 'OTP_LOCKED')
  }

  const ok = crypto.timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(hash(phone, code)))
  if (!ok) {
    otp.attempts += 1
    await otp.save()
    throw ApiError.badRequest('Wrong OTP. Please check and try again.', 'OTP_WRONG')
  }
  await Otp.deleteMany({ phone })
}
