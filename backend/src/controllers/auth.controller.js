import User from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { normalisePhone } from '../utils/helpers.js'
import { requestOtp, verifyOtp } from '../services/otp.service.js'
import { signUserToken } from '../middleware/auth.js'
import { loadMe } from './me.controller.js'

function phoneOrThrow(raw) {
  const phone = normalisePhone(raw)
  if (!phone) throw ApiError.validation('Enter a valid 10-digit mobile number.', { phone: 'Enter a valid 10-digit mobile number.' })
  return phone
}

/** POST /api/auth/otp { phone } -> { sent, devOtp?, resendIn } */
export async function sendOtp(req, res) {
  const phone = phoneOrThrow(req.body.phone)
  const existing = await User.findOne({ phone }).select('status suspendReason deletedAt').lean()
  if (existing?.status === 'suspended' && !existing.deletedAt) {
    throw ApiError.forbidden('This account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED')
  }
  const result = await requestOtp(phone)
  res.json({ success: true, ...result })
}

/** POST /api/auth/verify { phone, code, lang? } -> { token, user, isNew } */
export async function verify(req, res) {
  const phone = phoneOrThrow(req.body.phone)
  await verifyOtp(phone, req.body.code)

  let user = await User.findOne({ phone })
  let isNew = false
  if (!user) {
    user = await User.create({ phone, lang: req.body.lang || 'hi' })
    isNew = true
  } else if (user.deletedAt) {
    // A deleted account that signs in again starts fresh.
    user.set({ deletedAt: undefined, role: null, name: '', city: '', driver: undefined, owner: undefined, profileDone: false, kyc: { status: 'none' } })
    if (req.body.lang) user.lang = req.body.lang
    await user.save()
    isNew = true
  }
  if (user.status === 'suspended') throw ApiError.forbidden('This account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED')

  res.json({ success: true, token: signUserToken(user), isNew, user: await loadMe(user) })
}
