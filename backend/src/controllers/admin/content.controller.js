import User from '../../models/User.js'
import Job from '../../models/Job.js'
import {
  Broadcast,
  Category,
  Cms,
  Connection,
  Enquiry,
  Master,
  Notification,
  Payment,
  Plan,
  Report,
  Subscription,
  Vehicle,
} from '../../models/index.js'
import { ApiError } from '../../utils/ApiError.js'
import { assertId, DAY_MS, like, paging } from '../../utils/helpers.js'
import { publicUrl, removeStored, storedPath } from '../../middleware/upload.js'
import { notify } from '../../services/notify.service.js'
import { emitToUser, syncAdmins, syncUsers } from '../../services/realtime.js'
import { notificationOut } from '../../services/serialize.js'

const ref = (u) => (u ? { id: String(u._id), name: u.name || u.phone, phone: u.phone, company: u.owner?.company ?? '', role: u.role } : null)

const page = (items, total, p) => ({ success: true, items, total, page: p.page, pages: Math.max(1, Math.ceil(total / p.limit)) })

/* ------------------------------------------------------------------- Jobs */

export async function listJobs(req, res) {
  const { status, category, q, flagged } = req.query
  const filter = {}
  if (status) filter.status = status
  if (category) filter.category = category
  if (flagged === 'true') filter.reports = { $gt: 0 }
  if (q) filter.$or = [{ title: like(q) }, { area: like(q) }, { vehicle: like(q) }]
  const p = paging(req.query)
  const [items, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('owner', 'name phone owner role').lean(),
    Job.countDocuments(filter),
  ])
  res.json(
    page(
      items.map((j) => ({ ...j, id: String(j._id), _id: undefined, owner: ref(j.owner) })),
      total,
      p
    )
  )
}

/** PATCH /api/admin/jobs/:id { status, reason } (hide/restore = moderation) */
export async function moderateJob(req, res) {
  assertId(req.params.id, 'Job')
  const job = await Job.findById(req.params.id)
  if (!job) throw ApiError.notFound('Job not found.')
  const wasHidden = job.status === 'hidden'
  job.status = req.body.status
  job.hiddenReason = req.body.status === 'hidden' ? req.body.reason ?? '' : ''
  await job.save()
  syncUsers(job.owner, 'jobs')
  if (req.body.status === 'hidden' && !wasHidden) {
    await notify(job.owner, 'Job post hidden', `"${job.title}" was hidden by the Driver Finder team${req.body.reason ? `: ${req.body.reason}` : '.'}`)
  }
  res.json({ success: true })
}

/* --------------------------------------------------------------- Vehicles */

export async function listVehicles(req, res) {
  const { category, q } = req.query
  const filter = {}
  if (category) filter.category = category
  if (q) filter.$or = [{ number: like(q) }, { model: like(q) }]
  const p = paging(req.query)
  const [items, total] = await Promise.all([
    Vehicle.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('owner', 'name phone owner role').lean(),
    Vehicle.countDocuments(filter),
  ])
  res.json(page(items.map((v) => ({ id: String(v._id), category: v.category, model: v.model, number: v.number, year: v.year, driverName: v.driverName, photo: publicUrl(v.photo), status: v.status, owner: ref(v.owner), createdAt: v.createdAt })), total, p))
}

/* ------------------------------------------------------------ Connections */

export async function listConnections(req, res) {
  const filter = req.query.source ? { source: req.query.source } : {}
  const p = paging(req.query)
  const [items, total] = await Promise.all([
    Connection.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('owner', 'name phone owner role').populate('driver', 'name phone role').populate('job', 'title').lean(),
    Connection.countDocuments(filter),
  ])
  res.json(
    page(
      items.map((c) => ({ id: String(c._id), owner: ref(c.owner), driver: ref(c.driver), job: c.job ? { id: String(c.job._id), title: c.job.title } : null, source: c.source, status: c.status, lastMessageAt: c.lastMessageAt, createdAt: c.createdAt })),
      total,
      p
    )
  )
}

/* ------------------------------------------------------------------ Plans */

export async function listPlans(req, res) {
  const items = await Plan.find().sort({ role: 1, order: 1, months: 1 }).lean()
  res.json({ success: true, items: items.map((x) => ({ ...x, id: String(x._id), _id: undefined })) })
}

export async function createPlan(req, res) {
  const plan = await Plan.create(req.body)
  res.status(201).json({ success: true, plan })
}

export async function updatePlan(req, res) {
  assertId(req.params.id, 'Plan')
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!plan) throw ApiError.notFound('Plan not found.')
  res.json({ success: true, plan })
}

export async function deletePlan(req, res) {
  assertId(req.params.id, 'Plan')
  if (await Subscription.exists({ plan: req.params.id })) {
    throw ApiError.conflict('People have bought this plan. Turn it off instead of deleting it.')
  }
  await Plan.findByIdAndDelete(req.params.id)
  res.json({ success: true })
}

/* ------------------------------------------------ Subscriptions & payments */

export async function listSubscriptions(req, res) {
  const { state, role } = req.query
  const now = new Date()
  const filter = {}
  if (role) filter.role = role
  if (state === 'active') filter.expiresAt = { $gt: now }
  if (state === 'expired') filter.expiresAt = { $lte: now }
  const p = paging(req.query)
  const [items, total] = await Promise.all([
    Subscription.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('user', 'name phone owner role').lean(),
    Subscription.countDocuments(filter),
  ])
  res.json(page(items.map((s) => ({ id: String(s._id), user: ref(s.user), role: s.role, planName: s.planName, startsAt: s.startsAt, expiresAt: s.expiresAt, source: s.source, note: s.note, active: s.expiresAt > now })), total, p))
}

export async function listPayments(req, res) {
  const { status } = req.query
  const filter = status ? { status } : {}
  const p = paging(req.query)
  const [items, total, sum] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('user', 'name phone owner role').lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $match: { status: 'paid', method: 'razorpay' } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
  ])
  res.json({
    ...page(items.map((x) => ({ id: String(x._id), user: ref(x.user), receipt: x.receipt, planName: x.planName, role: x.role, amount: x.amount, status: x.status, method: x.method, orderId: x.orderId, paymentId: x.paymentId, note: x.note, createdAt: x.createdAt })), total, p),
    totalPaid: sum[0]?.sum ?? 0,
  })
}

/** POST /api/admin/subscriptions/grant { userId, planId?, days, note } (manual extend / free plan) */
export async function grantSubscription(req, res) {
  const { userId, planId, days, note } = req.body
  assertId(userId, 'User')
  const user = await User.findById(userId)
  if (!user?.role) throw ApiError.badRequest('This user has not chosen Driver or Owner yet.')
  const plan = planId ? await Plan.findById(planId).lean() : null
  const current = await Subscription.findOne({ user: user._id, role: user.role, expiresAt: { $gt: new Date() } }).sort({ expiresAt: -1 }).lean()
  const startsAt = current ? new Date(current.expiresAt) : new Date()
  await Payment.create({ user: user._id, plan: plan?._id ?? current?.plan ?? (await Plan.findOne({ role: user.role }).select('_id'))?._id, planName: plan?.name ?? `Extension ${days} days`, role: user.role, amount: 0, method: 'admin', status: 'paid', receipt: `ADM-${Date.now().toString(36).toUpperCase()}`, note })
  const sub = await Subscription.create({
    user: user._id,
    role: user.role,
    plan: plan?._id,
    planName: plan?.name ?? `Extension (${days} days)`,
    startsAt,
    expiresAt: new Date(startsAt.getTime() + days * DAY_MS),
    source: 'admin',
    note,
  })
  emitToUser(String(user._id), 'me:changed')
  syncAdmins('payments')
  await notify(user._id, 'Plan extended', `Your plan is active until ${sub.expiresAt.toLocaleDateString('en-IN')}.`, { screen: 'MyPlan' })
  res.status(201).json({ success: true })
}

/* ---------------------------------------------------------------- Masters */

export async function listCategories(req, res) {
  const items = await Category.find().sort({ order: 1, label: 1 }).lean()
  res.json({ success: true, items: items.map((c) => ({ ...c, id: String(c._id), _id: undefined, image: publicUrl(c.image) })) })
}

export async function createCategory(req, res) {
  if (await Category.exists({ key: req.body.key })) throw ApiError.conflict('A category with this key already exists.')
  const c = await Category.create(req.body)
  res.status(201).json({ success: true, id: String(c._id) })
}

export async function updateCategory(req, res) {
  assertId(req.params.id, 'Category')
  const { key, ...data } = req.body // the key is referenced by jobs and drivers; never renamed
  const c = await Category.findByIdAndUpdate(req.params.id, data, { new: true })
  if (!c) throw ApiError.notFound('Category not found.')
  res.json({ success: true })
}

export async function uploadCategoryImage(req, res) {
  assertId(req.params.id, 'Category')
  const c = await Category.findById(req.params.id)
  if (!c) throw ApiError.notFound('Category not found.')
  removeStored(c.image)
  c.image = storedPath(req.file)
  await c.save()
  res.json({ success: true, image: publicUrl(c.image) })
}

export async function listMasters(req, res) {
  const items = await Master.find(req.query.type ? { type: req.query.type } : {}).sort({ type: 1, order: 1, value: 1 }).lean()
  res.json({ success: true, items: items.map((m) => ({ ...m, id: String(m._id), _id: undefined })) })
}

export async function createMaster(req, res) {
  const m = await Master.create(req.body)
  res.status(201).json({ success: true, id: String(m._id) })
}

export async function updateMaster(req, res) {
  assertId(req.params.id, 'Item')
  await Master.findByIdAndUpdate(req.params.id, req.body)
  res.json({ success: true })
}

export async function deleteMaster(req, res) {
  assertId(req.params.id, 'Item')
  await Master.findByIdAndDelete(req.params.id)
  res.json({ success: true })
}

/* ---------------------------------------------------------------- Reports */

export async function listReports(req, res) {
  const filter = req.query.status ? { status: req.query.status } : {}
  const p = paging(req.query)
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate('reporter', 'name phone owner role').populate('targetUser', 'name phone owner role').populate('targetJob', 'title status').lean(),
    Report.countDocuments(filter),
  ])
  res.json(page(items.map((r) => ({ id: String(r._id), reporter: ref(r.reporter), targetType: r.targetType, targetUser: ref(r.targetUser), targetJob: r.targetJob ? { id: String(r.targetJob._id), title: r.targetJob.title, status: r.targetJob.status } : null, reason: r.reason, details: r.details, status: r.status, note: r.note, createdAt: r.createdAt })), total, p))
}

export async function updateReport(req, res) {
  assertId(req.params.id, 'Report')
  await Report.findByIdAndUpdate(req.params.id, { ...req.body, resolvedBy: req.admin._id })
  res.json({ success: true })
}

/* -------------------------------------------------------------- Enquiries */

export async function listEnquiries(req, res) {
  const filter = req.query.status ? { status: req.query.status } : {}
  const p = paging(req.query)
  const [items, total] = await Promise.all([Enquiry.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(), Enquiry.countDocuments(filter)])
  res.json(page(items.map((e) => ({ ...e, id: String(e._id), _id: undefined })), total, p))
}

export async function updateEnquiry(req, res) {
  assertId(req.params.id, 'Enquiry')
  await Enquiry.findByIdAndUpdate(req.params.id, { status: req.body.status === 'done' ? 'done' : 'new' })
  res.json({ success: true })
}

/* ------------------------------------------------------------- Broadcasts */

export async function listBroadcasts(req, res) {
  const items = await Broadcast.find().sort({ createdAt: -1 }).limit(100).populate('sentBy', 'name').lean()
  res.json({ success: true, items: items.map((b) => ({ id: String(b._id), audience: b.audience, title: b.title, text: b.text, recipients: b.recipients, sentBy: b.sentBy?.name ?? '', createdAt: b.createdAt })) })
}

export async function sendBroadcast(req, res) {
  const { audience, title, text } = req.body
  const filter = { deletedAt: null, status: 'active', ...(audience === 'all' ? { role: { $in: ['driver', 'owner'] } } : { role: audience }) }
  const ids = await User.find(filter).distinct('_id')
  const BATCH = 1000
  for (let i = 0; i < ids.length; i += BATCH) {
    const docs = await Notification.insertMany(ids.slice(i, i + BATCH).map((user) => ({ user, title, text, type: 'broadcast' })), { ordered: false })
    for (const n of docs) emitToUser(String(n.user), 'notification', { notification: notificationOut(n.toObject ? n.toObject() : n) })
  }
  const b = await Broadcast.create({ audience, title, text, sentBy: req.admin._id, recipients: ids.length })
  res.status(201).json({ success: true, recipients: ids.length, id: String(b._id) })
}

/* -------------------------------------------------------------------- CMS */

export const CMS_KEYS = ['support', 'faq', 'terms', 'privacy', 'refund', 'fees']

export async function getAllCms(req, res) {
  const docs = await Cms.find({ key: { $in: CMS_KEYS } }).lean()
  res.json({ success: true, items: Object.fromEntries(CMS_KEYS.map((k) => [k, docs.find((d) => d.key === k)?.value ?? null])) })
}

export async function putCms(req, res) {
  if (!CMS_KEYS.includes(req.params.key)) throw ApiError.notFound('Unknown page.')
  await Cms.findOneAndUpdate({ key: req.params.key }, { value: req.body.value, updatedBy: req.admin._id }, { upsert: true })
  res.json({ success: true })
}
