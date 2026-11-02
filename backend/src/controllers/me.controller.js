import User, { REQUIRED_DOCS } from '../models/User.js'
import Job from '../models/Job.js'
import { Category, Cms, Document, Enquiry, Master, Notification, Plan, Report } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId, escapeRegex } from '../utils/helpers.js'
import { activeSubscription } from '../services/gate.service.js'
import { meOut, notificationOut, planOut } from '../services/serialize.js'
import { publicUrl, removeStored, storedPath } from '../middleware/upload.js'
import { env } from '../config/env.js'
import { syncAdmins } from '../services/realtime.js'

/** The full /me payload: profile, KYC docs and current plan. */
export async function loadMe(user) {
  const [subscription, docs] = await Promise.all([activeSubscription(user), Document.find({ user: user._id }).lean()])
  return meOut(user.toObject ? user.toObject() : user, { subscription, docs })
}

export async function getMe(req, res) {
  res.json({ success: true, user: await loadMe(req.user) })
}

/** PATCH /api/me { lang?, name?, city?, prefs? } */
export async function updateMe(req, res) {
  const { prefs, ...rest } = req.body
  req.user.set(rest)
  if (prefs) req.user.prefs = { ...req.user.prefs.toObject?.() ?? req.user.prefs, ...prefs }
  await req.user.save()
  res.json({ success: true, user: await loadMe(req.user) })
}

/** POST /api/me/role { role }. The role is chosen once; changing it later goes through support. */
export async function setRole(req, res) {
  const { role } = req.body
  if (req.user.role && req.user.role !== role && req.user.kyc.status !== 'none') {
    throw ApiError.conflict('Your account is already registered with another role. Please contact support to change it.', 'ROLE_LOCKED')
  }
  req.user.role = role
  if (role === 'driver' && !req.user.driver) req.user.driver = {}
  if (role === 'owner' && !req.user.owner) req.user.owner = {}
  await req.user.save()
  res.json({ success: true, user: await loadMe(req.user) })
}

/** PUT /api/me/driver: the driver setup wizard. */
export async function saveDriverProfile(req, res) {
  const { name, city, ...driver } = req.body
  req.user.set({ name, city, driver, profileDone: true })
  await req.user.save()
  res.json({ success: true, user: await loadMe(req.user) })
}

/** PUT /api/me/owner: the owner setup screen. */
export async function saveOwnerProfile(req, res) {
  const { name, city, company, type } = req.body
  req.user.set({ name, city, owner: { company: company || name, type }, profileDone: true })
  await req.user.save()
  res.json({ success: true, user: await loadMe(req.user) })
}

/** POST /api/me/photo (multipart "file") */
export async function uploadMyPhoto(req, res) {
  const old = req.user.photo
  req.user.photo = storedPath(req.file)
  await req.user.save()
  removeStored(old)
  res.json({ success: true, photo: publicUrl(req.user.photo) })
}

/** DELETE /api/me: soft delete (Play Store requires in-app account deletion). */
export async function deleteMe(req, res) {
  req.user.set({ deletedAt: new Date(), name: '', city: '', photo: null, saved: [] })
  await req.user.save()
  await Job.updateMany({ owner: req.user._id, status: 'active' }, { status: 'closed' })
  res.json({ success: true })
}

/* -------------------------------------------------------------------- KYC */

/** POST /api/kyc/docs/:key (multipart "file") */
export async function uploadKycDoc(req, res) {
  const { key } = req.params
  const allowed = [...(REQUIRED_DOCS[req.user.role] ?? []), 'policeVerification', 'badge', 'gst', 'selfie']
  if (!allowed.includes(key)) {
    removeStored(storedPath(req.file))
    throw ApiError.badRequest('Unknown document type.')
  }
  if (req.user.kyc.status === 'approved') {
    removeStored(storedPath(req.file))
    throw ApiError.conflict('Your documents are already verified.', 'KYC_LOCKED')
  }

  const existing = await Document.findOne({ user: req.user._id, key })
  if (existing) removeStored(existing.file)
  await Document.findOneAndUpdate(
    { user: req.user._id, key },
    { file: storedPath(req.file), mime: req.file.mimetype, status: 'uploaded', reason: '' },
    { upsert: true, new: true }
  )
  res.json({ success: true, user: await loadMe(req.user) })
}

/** POST /api/kyc/submit: all required documents must be uploaded. */
export async function submitKyc(req, res) {
  if (!req.user.role) throw ApiError.badRequest('Choose Driver or Vehicle Owner first.')
  const docs = await Document.find({ user: req.user._id }).lean()
  const missing = REQUIRED_DOCS[req.user.role].filter((k) => !docs.some((d) => d.key === k && d.status !== 'rejected'))
  if (missing.length) {
    throw ApiError.validation('Please add all the documents first.', Object.fromEntries(missing.map((k) => [k, 'Missing'])))
  }
  if (req.user.kyc.status === 'approved') throw ApiError.conflict('Your documents are already verified.', 'KYC_LOCKED')

  req.user.kyc = { status: 'pending', reason: '', submittedAt: new Date() }
  await req.user.save()
  syncAdmins(['kyc', 'users'])
  res.json({ success: true, user: await loadMe(req.user) })
}

/* ---------------------------------------------------------- Notifications */

export async function listNotifications(req, res) {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean()
  res.json({ success: true, notifications: items.map(notificationOut), unread: items.filter((n) => !n.read).length })
}

export async function readNotifications(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true })
  res.json({ success: true })
}

/* ---------------------------------------------------------------- Reports */

export async function createReport(req, res) {
  const { targetType, targetId, reason, details } = req.body
  assertId(targetId, targetType === 'job' ? 'Job' : 'User')
  const doc = { reporter: req.user._id, targetType, reason, details }
  if (targetType === 'job') {
    const job = await Job.findById(targetId)
    if (!job) throw ApiError.notFound('Job not found.')
    doc.targetJob = job._id
    doc.targetUser = job.owner
    await Job.updateOne({ _id: job._id }, { $inc: { reports: 1 } })
  } else {
    doc.targetUser = targetId
  }
  await Report.create(doc)
  syncAdmins('reports')
  res.status(201).json({ success: true })
}

/* ------------------------------------------------- Public data (no login) */

const CMS_DEFAULTS = {
  support: { phone: '', whatsapp: '', email: '', hours: '9 AM - 7 PM, Mon-Sat' },
  fees: { registration: 1 },
}

/** Fees the admin sets (Content & support -> fees). Registration is in whole rupees. */
export async function getFees() {
  const doc = await Cms.findOne({ key: 'fees' }).lean()
  return { ...CMS_DEFAULTS.fees, ...(doc?.value ?? {}) }
}

/** GET /api/meta: everything the app needs at start-up. */
export async function getMeta(req, res) {
  const [categories, masters, plans, support, fees] = await Promise.all([
    Category.find({ active: true }).sort({ order: 1, label: 1 }).lean(),
    Master.find({ active: true }).sort({ order: 1, value: 1 }).lean(),
    Plan.find({ active: true }).sort({ role: 1, order: 1, months: 1 }).lean(),
    Cms.findOne({ key: 'support' }).lean(),
    getFees(),
  ])
  res.set('Cache-Control', 'public, max-age=60')
  res.json({
    success: true,
    categories: categories.map((c) => ({
      key: c.key,
      label: c.label,
      labels: c.labels ?? {},
      image: publicUrl(c.image),
      color: c.color,
      types: c.types,
    })),
    cities: masters.filter((m) => m.type === 'city').map((m) => m.value),
    licenceTypes: masters.filter((m) => m.type === 'licence').map((m) => m.value),
    plans: plans.map(planOut),
    support: support?.value ?? CMS_DEFAULTS.support,
    fees,
    otpEnabled: env.otp.enabled,
    razorpayKeyId: env.razorpay.keyId || null,
  })
}

/** GET /api/cms/:key (terms, privacy, refund, faq, support) */
export async function getCms(req, res) {
  const doc = await Cms.findOne({ key: req.params.key }).lean()
  res.json({ success: true, key: req.params.key, value: doc?.value ?? CMS_DEFAULTS[req.params.key] ?? '', updatedAt: doc?.updatedAt ?? null })
}

/**
 * POST /api/cities { name }: "Other" in the city picker. The new city is saved
 * once (case-insensitive) and from then on appears in everyone's list.
 */
export async function addCity(req, res) {
  const name = req.body.name.replace(/\s+/g, ' ').replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase())
  const existing = await Master.findOne({ type: 'city', value: new RegExp(`^${escapeRegex(name)}$`, 'i') }).lean()
  if (existing) return res.json({ success: true, city: existing.value, created: false })
  const last = await Master.findOne({ type: 'city' }).sort({ order: -1 }).select('order').lean()
  await Master.create({ type: 'city', value: name, order: (last?.order ?? 0) + 1, addedBy: req.user._id })
  syncAdmins('masters')
  res.status(201).json({ success: true, city: name, created: true })
}

/** POST /api/enquiries: landing page contact form. */
export async function createEnquiry(req, res) {
  const { website, ...data } = req.body
  // Honeypot filled: pretend success so bots learn nothing.
  if (!website) {
    await Enquiry.create(data)
    syncAdmins('enquiries')
  }
  res.status(201).json({ success: true, message: 'Thank you. Our team will call you soon.' })
}

/** GET /api/stats: public counters for the landing page. */
export async function publicStats(req, res) {
  const [drivers, owners, jobs] = await Promise.all([
    User.countDocuments({ role: 'driver', 'kyc.status': 'approved', deletedAt: null }),
    User.countDocuments({ role: 'owner', 'kyc.status': 'approved', deletedAt: null }),
    Job.countDocuments({ status: 'active' }),
  ])
  res.json({ success: true, drivers, owners, jobs })
}
