import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { env, isRazorpayConfigured } from '../config/env.js'
import { Payment, Plan, Subscription } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId, DAY_MS } from '../utils/helpers.js'
import { activeSubscription } from '../services/gate.service.js'
import { planOut, subscriptionOut } from '../services/serialize.js'
import { notify } from '../services/notify.service.js'
import { emitToUser, syncAdmins } from '../services/realtime.js'
import User from '../models/User.js'
import { getFees } from './me.controller.js'

let client
function razorpay() {
  if (!isRazorpayConfigured) throw new ApiError(503, 'Payments are not available right now.', { code: 'PAYMENTS_OFF' })
  client ??= new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret })
  return client
}

/** GET /api/plans: plans for the user's role. */
export async function listPlans(req, res) {
  const plans = await Plan.find({ active: true, ...(req.user.role ? { role: req.user.role } : {}) }).sort({ order: 1, months: 1 }).lean()
  res.json({ success: true, plans: plans.map(planOut) })
}

/** GET /api/subscription: current plan + payment history. */
export async function mySubscription(req, res) {
  const [current, payments] = await Promise.all([
    activeSubscription(req.user),
    Payment.find({ user: req.user._id, status: 'paid' }).sort({ createdAt: -1 }).limit(50).lean(),
  ])
  res.json({
    success: true,
    plan: subscriptionOut(current),
    payments: payments.map((p) => ({
      id: p.receipt || String(p._id),
      name: p.planName,
      role: p.role,
      amount: p.amount,
      method: p.method,
      at: p.createdAt.getTime(),
    })),
  })
}

/** POST /api/payments/order { planId } -> Razorpay order for the app's checkout. */
export async function createOrder(req, res) {
  assertId(req.body.planId, 'Plan')
  const plan = await Plan.findOne({ _id: req.body.planId, active: true, role: req.user.role })
  if (!plan) throw ApiError.notFound('This plan is not available.')
  if (!plan.price) throw ApiError.badRequest('This plan will be available at launch.', 'PRICE_NOT_SET')

  const receipt = `DF-${Date.now().toString(36).toUpperCase()}`
  const order = await razorpay().orders.create({
    amount: plan.price * 100,
    currency: env.razorpay.currency,
    receipt,
    notes: { userId: String(req.user._id), planId: String(plan._id), role: plan.role },
  })
  await Payment.create({
    user: req.user._id,
    plan: plan._id,
    planName: plan.name,
    role: plan.role,
    amount: plan.price,
    orderId: order.id,
    receipt,
  })
  res.status(201).json({
    success: true,
    order: { id: order.id, amount: order.amount, currency: order.currency, receipt },
    keyId: env.razorpay.keyId,
    plan: planOut(plan),
    prefill: { contact: `+91${req.user.phone}`, name: req.user.name },
  })
}

/**
 * Activates (or extends) the plan for a paid payment. Idempotent: the app's
 * verify call and the webhook may both arrive.
 */
async function activate(payment, paymentId) {
  const done = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'paid' } },
    { status: 'paid', paymentId },
    { new: true }
  )
  if (payment.kind === 'registration') {
    if (done) {
      await User.updateOne({ _id: payment.user }, { registration: { paid: true, paidAt: new Date(), payment: payment._id } })
      emitToUser(String(payment.user), 'me:changed')
      syncAdmins(['payments', 'users'])
    }
    return null
  }
  if (!done) return Subscription.findOne({ payment: payment._id }).lean()

  const plan = await Plan.findById(payment.plan).lean()
  const current = await Subscription.findOne({ user: payment.user, role: payment.role, expiresAt: { $gt: new Date() } }).sort({ expiresAt: -1 }).lean()
  // Buying again before expiry extends from the current end date.
  const startsAt = current ? new Date(current.expiresAt) : new Date()
  const sub = await Subscription.create({
    user: payment.user,
    role: payment.role,
    plan: payment.plan,
    planName: payment.planName,
    startsAt,
    expiresAt: new Date(startsAt.getTime() + (plan?.months ?? 1) * 30 * DAY_MS),
    payment: payment._id,
    source: 'razorpay',
  })
  emitToUser(String(payment.user), 'me:changed')
  syncAdmins('payments')
  await notify(payment.user, 'Plan active', `Your ${payment.planName} plan is active. You can now apply, connect and chat.`, { screen: 'MyPlan' })
  return sub.toObject()
}

/**
 * POST /api/payments/registration -> Razorpay order for the one-time sign-up
 * fee (₹1 unless the admin changes it). A fee of 0 marks the user registered.
 */
export async function createRegistrationOrder(req, res) {
  if (req.user.registration?.paid) return res.json({ success: true, alreadyPaid: true })
  const { registration: fee } = await getFees()
  if (!fee) {
    req.user.registration = { paid: true, paidAt: new Date() }
    await req.user.save()
    return res.json({ success: true, alreadyPaid: true })
  }
  const receipt = `DFR-${Date.now().toString(36).toUpperCase()}`
  const order = await razorpay().orders.create({
    amount: fee * 100,
    currency: env.razorpay.currency,
    receipt,
    notes: { userId: String(req.user._id), kind: 'registration' },
  })
  await Payment.create({ user: req.user._id, kind: 'registration', planName: 'Registration', role: req.user.role, amount: fee, orderId: order.id, receipt })
  res.status(201).json({
    success: true,
    order: { id: order.id, amount: order.amount, currency: order.currency, receipt },
    keyId: env.razorpay.keyId,
    prefill: { contact: `+91${req.user.phone}`, name: req.user.name },
  })
}

/** POST /api/payments/verify { orderId, paymentId, signature } */
export async function verifyPayment(req, res) {
  const { orderId, paymentId, signature } = req.body
  const payment = await Payment.findOne({ orderId, user: req.user._id })
  if (!payment) throw ApiError.notFound('Payment not found.')

  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  const valid = expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  if (!valid) {
    await Payment.updateOne({ _id: payment._id, status: 'created' }, { status: 'failed', note: 'Signature mismatch' })
    throw ApiError.badRequest('Payment could not be verified. If money was deducted, it will be refunded.', 'PAYMENT_INVALID')
  }

  const sub = await activate(payment, paymentId)
  if (payment.kind === 'registration') return res.json({ success: true, registration: { paid: true } })
  res.json({ success: true, plan: subscriptionOut(sub) })
}

/** POST /api/payments/failed { orderId, reason? }: the user closed checkout or the payment failed. */
export async function paymentFailed(req, res) {
  await Payment.updateOne({ orderId: req.body.orderId, user: req.user._id, status: 'created' }, { status: 'failed', note: String(req.body.reason ?? '').slice(0, 200) })
  res.json({ success: true })
}

/**
 * POST /api/payments/webhook (Razorpay -> server, raw body). Set the webhook
 * secret = RAZORPAY_WEBHOOK_SECRET (falls back to the key secret) and select
 * the payment.captured event. Covers users who close the app mid-payment.
 */
export async function webhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || env.razorpay.keySecret
  const sig = req.headers['x-razorpay-signature']
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex')
  if (!sig || sig !== expected) return res.status(400).json({ success: false })

  const event = JSON.parse(req.body.toString('utf8'))
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const p = event.payload?.payment?.entity
    const payment = p?.order_id && (await Payment.findOne({ orderId: p.order_id }))
    if (payment) await activate(payment, p.id)
  }
  res.json({ success: true })
}
