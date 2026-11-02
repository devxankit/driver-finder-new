import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import User, { REQUIRED_DOCS } from '../../models/User.js'
import Job from '../../models/Job.js'
import {
  Admin,
  Application,
  Connection,
  Document,
  HireRequest,
  Payment,
  Report,
  Subscription,
  Vehicle,
  Enquiry,
} from '../../models/index.js'
import { ApiError } from '../../utils/ApiError.js'
import { assertId, DAY_MS, like, paging } from '../../utils/helpers.js'
import { absolutePath, publicUrl } from '../../middleware/upload.js'
import { signAdminToken } from '../../middleware/auth.js'
import { notify } from '../../services/notify.service.js'
import { emitToUser, syncAdmins } from '../../services/realtime.js'

const adminOut = (a) => ({ id: String(a._id), name: a.name, email: a.email, role: a.role, active: a.active, lastLoginAt: a.lastLoginAt, createdAt: a.createdAt })

/* ------------------------------------------------------------------- Auth */

export async function login(req, res) {
  const admin = await Admin.findOne({ email: req.body.email }).select('+passwordHash')
  const ok = admin && admin.active && (await bcrypt.compare(req.body.password, admin.passwordHash))
  if (!ok) throw ApiError.unauthorized('Wrong email or password.', 'BAD_LOGIN')
  admin.lastLoginAt = new Date()
  await admin.save()
  res.json({ success: true, token: signAdminToken(admin), admin: adminOut(admin) })
}

export async function me(req, res) {
  res.json({ success: true, admin: adminOut(req.admin) })
}

export async function changePassword(req, res) {
  const admin = await Admin.findById(req.admin._id).select('+passwordHash')
  if (!(await bcrypt.compare(req.body.current, admin.passwordHash))) throw ApiError.validation('Current password is wrong.', { current: 'Current password is wrong.' })
  admin.passwordHash = await bcrypt.hash(req.body.next, 12)
  await admin.save()
  res.json({ success: true })
}

/* -------------------------------------------------------------- Dashboard */

export async function dashboard(req, res) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const since14 = new Date(now.getTime() - 13 * DAY_MS)
  since14.setHours(0, 0, 0, 0)
  const since6m = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const live = { deletedAt: null }

  const [
    drivers,
    owners,
    approvedDrivers,
    approvedOwners,
    kycPendingDrivers,
    kycPendingOwners,
    activeSubs,
    revenueAll,
    revenueMonth,
    activeJobs,
    jobs7d,
    connections,
    applications,
    openReports,
    newEnquiries,
    signups,
    revenueByMonth,
    queue,
  ] = await Promise.all([
    User.countDocuments({ ...live, role: 'driver' }),
    User.countDocuments({ ...live, role: 'owner' }),
    User.countDocuments({ ...live, role: 'driver', 'kyc.status': 'approved' }),
    User.countDocuments({ ...live, role: 'owner', 'kyc.status': 'approved' }),
    User.countDocuments({ ...live, role: 'driver', 'kyc.status': 'pending' }),
    User.countDocuments({ ...live, role: 'owner', 'kyc.status': 'pending' }),
    Subscription.distinct('user', { expiresAt: { $gt: now } }).then((x) => x.length),
    Payment.aggregate([{ $match: { status: 'paid', method: 'razorpay' } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'paid', method: 'razorpay', createdAt: { $gte: monthStart } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Job.countDocuments({ status: 'active' }),
    Job.countDocuments({ createdAt: { $gte: new Date(now.getTime() - 7 * DAY_MS) } }),
    Connection.countDocuments(),
    Application.countDocuments(),
    Report.countDocuments({ status: 'open' }),
    Enquiry.countDocuments({ status: 'new' }),
    User.aggregate([
      { $match: { createdAt: { $gte: since14 }, role: { $in: ['driver', 'owner'] } } },
      { $group: { _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }, r: '$role' }, n: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'paid', method: 'razorpay', createdAt: { $gte: since6m } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+05:30' } }, sum: { $sum: '$amount' }, n: { $sum: 1 } } },
    ]),
    User.find({ ...live, 'kyc.status': 'pending' }).sort({ 'kyc.submittedAt': 1 }).limit(6).lean(),
  ])

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS)
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS)
  const [revenueLastMonth, jobsPrev7, jobsByCategory, driversByCategory, activity] = await Promise.all([
    Payment.aggregate([{ $match: { status: 'paid', method: 'razorpay', createdAt: { $gte: lastMonthStart, $lt: monthStart } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Job.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
    Job.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    User.aggregate([{ $match: { ...live, role: 'driver', 'kyc.status': 'approved' } }, { $unwind: '$driver.categories' }, { $group: { _id: '$driver.categories', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    recentActivity(),
  ])

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since14.getTime() + i * DAY_MS + 5.5 * 3600 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  res.json({
    success: true,
    stats: {
      drivers,
      owners,
      approvedDrivers,
      approvedOwners,
      kycPending: kycPendingDrivers + kycPendingOwners,
      kycPendingDrivers,
      kycPendingOwners,
      activeSubs,
      revenue: revenueAll[0]?.sum ?? 0,
      revenueMonth: revenueMonth[0]?.sum ?? 0,
      activeJobs,
      jobs7d,
      connections,
      applications,
      openReports,
      newEnquiries,
      revenueLastMonth: revenueLastMonth[0]?.sum ?? 0,
      jobsPrev7,
    },
    breakdown: {
      jobs: jobsByCategory.map((x) => ({ key: x._id, count: x.n })),
      drivers: driversByCategory.map((x) => ({ key: x._id, count: x.n })),
    },
    activity,
    signups: days.map((d) => ({
      date: d,
      drivers: signups.find((s) => s._id.d === d && s._id.r === 'driver')?.n ?? 0,
      owners: signups.find((s) => s._id.d === d && s._id.r === 'owner')?.n ?? 0,
    })),
    revenue: months.map((m) => {
      const r = revenueByMonth.find((x) => x._id === m)
      return { month: m, amount: r?.sum ?? 0, count: r?.n ?? 0 }
    }),
    queue: queue.map(userRow),
  })
}

/** The latest things that happened on the platform, newest first, for the dashboard feed. */
async function recentActivity(limit = 14) {
  const [users, kyc, payments, jobs, conns] = await Promise.all([
    User.find({ role: { $ne: null }, deletedAt: null }).sort({ createdAt: -1 }).limit(limit).select('name phone role createdAt photo owner').lean(),
    User.find({ 'kyc.submittedAt': { $ne: null }, deletedAt: null }).sort({ 'kyc.submittedAt': -1 }).limit(limit).select('name phone role kyc photo').lean(),
    Payment.find({ status: 'paid' }).sort({ createdAt: -1 }).limit(limit).populate('user', 'name phone role').lean(),
    Job.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'name owner').select('title owner createdAt category').lean(),
    Connection.find().sort({ createdAt: -1 }).limit(limit).populate('owner', 'name owner').populate('driver', 'name').lean(),
  ])
  const who = (u) => u?.owner?.company || u?.name || u?.phone || 'Someone'
  const items = [
    ...users.map((u) => ({ type: 'signup', at: u.createdAt, text: `${u.name || u.phone} joined as ${u.role === 'owner' ? 'a vehicle owner' : 'a driver'}`, userId: String(u._id), role: u.role, photo: publicUrl(u.photo) })),
    ...kyc.map((u) => ({ type: u.kyc.status === 'approved' ? 'kyc-approved' : u.kyc.status === 'rejected' ? 'kyc-rejected' : 'kyc', at: u.kyc.status === 'pending' ? u.kyc.submittedAt : u.kyc.reviewedAt ?? u.kyc.submittedAt, text: u.kyc.status === 'pending' ? `${u.name || u.phone} sent KYC documents` : `${u.name || u.phone}'s KYC was ${u.kyc.status}`, userId: String(u._id), role: u.role, photo: publicUrl(u.photo) })),
    ...payments.map((p) => ({ type: 'payment', at: p.createdAt, text: `${p.user?.name || 'A user'} paid ₹${p.amount} · ${p.planName}`, userId: p.user ? String(p.user._id) : null, role: p.user?.role, amount: p.amount })),
    ...jobs.map((j) => ({ type: 'job', at: j.createdAt, text: `${who(j.owner)} posted “${j.title}”`, jobId: String(j._id) })),
    ...conns.map((c) => ({ type: 'connection', at: c.createdAt, text: `${who(c.owner)} connected with ${c.driver?.name || 'a driver'}` })),
  ]
  return items
    .filter((x) => x.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)
}

/** GET /api/admin/counts: the small numbers for the sidebar and top bar (cheap, polled often). */
export async function counts(req, res) {
  const [kycPending, openReports, newEnquiries] = await Promise.all([
    User.countDocuments({ deletedAt: null, 'kyc.status': 'pending' }),
    Report.countDocuments({ status: 'open' }),
    Enquiry.countDocuments({ status: 'new' }),
  ])
  res.json({ success: true, counts: { kycPending, openReports, newEnquiries } })
}

/* ------------------------------------------------------------------ Users */

export function userRow(u) {
  return {
    id: String(u._id),
    phone: u.phone,
    role: u.role,
    name: u.name,
    city: u.city,
    company: u.owner?.company ?? '',
    photo: publicUrl(u.photo),
    status: u.status,
    kyc: u.kyc?.status ?? 'none',
    kycSubmittedAt: u.kyc?.submittedAt ?? null,
    profileDone: u.profileDone,
    deleted: Boolean(u.deletedAt),
    createdAt: u.createdAt,
    lastSeenAt: u.lastSeenAt ?? null,
    categories: u.driver?.categories ?? [],
    experience: u.driver?.experience ?? null,
  }
}

/** GET /api/admin/users?role=&kyc=&status=&category=&q=&page= */
export async function listUsers(req, res) {
  const { role, kyc, status, q, deleted, category } = req.query
  const filter = deleted === 'true' ? { deletedAt: { $ne: null } } : { deletedAt: null }
  if (role) filter.role = role === 'none' ? null : role
  if (kyc) filter['kyc.status'] = kyc
  if (status) filter.status = status
  if (category) filter['driver.categories'] = category
  if (q) filter.$or = [{ name: like(q) }, { phone: like(q) }, { city: like(q) }, { 'owner.company': like(q) }]
  const { page, limit, skip } = paging(req.query, 20)
  const sort = kyc === 'pending' ? { 'kyc.submittedAt': 1 } : { createdAt: -1 }
  const [items, total] = await Promise.all([User.find(filter).sort(sort).skip(skip).limit(limit).lean(), User.countDocuments(filter)])
  res.json({ success: true, items: items.map(userRow), total, page, pages: Math.max(1, Math.ceil(total / limit)) })
}

const docUrl = (d) => `/api/admin/documents/${d._id}/file`

/** GET /api/admin/users/:id: everything about one user. */
export async function userDetail(req, res) {
  assertId(req.params.id, 'User')
  const u = await User.findById(req.params.id).lean()
  if (!u) throw ApiError.notFound('User not found.')
  const isOwner = u.role === 'owner'
  const [docs, subs, payments, connections, vehicles, jobs, applications, requests, reports] = await Promise.all([
    Document.find({ user: u._id }).lean(),
    Subscription.find({ user: u._id }).sort({ expiresAt: -1 }).lean(),
    Payment.find({ user: u._id }).sort({ createdAt: -1 }).limit(30).lean(),
    Connection.countDocuments(isOwner ? { owner: u._id } : { driver: u._id }),
    isOwner ? Vehicle.find({ owner: u._id }).lean() : [],
    isOwner ? Job.find({ owner: u._id }).sort({ createdAt: -1 }).lean() : [],
    isOwner ? [] : Application.find({ driver: u._id }).sort({ createdAt: -1 }).populate('job', 'title status').lean(),
    HireRequest.countDocuments(isOwner ? { owner: u._id } : { driver: u._id }),
    Report.countDocuments({ targetUser: u._id }),
  ])
  const required = REQUIRED_DOCS[u.role] ?? []
  res.json({
    success: true,
    user: {
      ...userRow(u),
      lang: u.lang,
      driver: u.driver ?? null,
      owner: u.owner ?? null,
      kycDetail: u.kyc,
      registration: u.registration ?? { paid: false },
      suspendReason: u.suspendReason,
    },
    documents: docs
      .map((d) => ({ id: String(d._id), key: d.key, status: d.status, reason: d.reason, mime: d.mime, url: docUrl(d), updatedAt: d.updatedAt, required: required.includes(d.key) }))
      .sort((a, b) => required.indexOf(a.key) - required.indexOf(b.key)),
    missingDocs: required.filter((k) => !docs.some((d) => d.key === k)),
    subscriptions: subs.map((s) => ({ id: String(s._id), planName: s.planName, role: s.role, startsAt: s.startsAt, expiresAt: s.expiresAt, source: s.source, note: s.note, active: new Date(s.expiresAt) > new Date() })),
    payments: payments.map((p) => ({ id: String(p._id), receipt: p.receipt, planName: p.planName, amount: p.amount, status: p.status, method: p.method, paymentId: p.paymentId, createdAt: p.createdAt })),
    counts: { connections, requests, reports },
    vehicles: vehicles.map((v) => ({ id: String(v._id), category: v.category, model: v.model, number: v.number, year: v.year, photo: publicUrl(v.photo) })),
    jobs: jobs.map((j) => ({ id: String(j._id), title: j.title, status: j.status, applicants: j.applicants, createdAt: j.createdAt })),
    applications: applications.map((a) => ({ id: String(a._id), status: a.status, job: a.job ? { id: String(a.job._id), title: a.job.title, status: a.job.status } : null, createdAt: a.createdAt })),
  })
}

/** PATCH /api/admin/users/:id/status { status, reason? } */
export async function setUserStatus(req, res) {
  assertId(req.params.id, 'User')
  const u = await User.findById(req.params.id)
  if (!u) throw ApiError.notFound('User not found.')
  u.status = req.body.status
  u.suspendReason = req.body.status === 'suspended' ? req.body.reason ?? '' : ''
  emitToUser(String(u._id), 'me:changed')
  // A suspended owner's jobs drop out of the driver feed automatically (see jobs.feed).
  await u.save()
  res.json({ success: true, user: userRow(u.toObject()) })
}

/* -------------------------------------------------------------------- KYC */

/** POST /api/admin/kyc/:id/approve */
export async function approveKyc(req, res) {
  assertId(req.params.id, 'User')
  const u = await User.findById(req.params.id)
  if (!u) throw ApiError.notFound('User not found.')
  const required = REQUIRED_DOCS[u.role] ?? []
  const docs = await Document.find({ user: u._id })
  const missing = required.filter((k) => !docs.some((d) => d.key === k))
  if (missing.length) throw ApiError.badRequest(`Documents missing: ${missing.join(', ')}`)

  await Document.updateMany({ user: u._id }, { status: 'approved', reason: '' })
  u.kyc = { ...u.kyc.toObject(), status: 'approved', reason: '', reviewedAt: new Date(), reviewedBy: req.admin._id }
  await u.save()
  emitToUser(String(u._id), 'me:changed')
  syncAdmins(['kyc', 'users'])
  await notify(u._id, 'Profile approved', 'Your documents are verified. Your profile is now live.', { screen: 'KycStatus' })
  res.json({ success: true, user: userRow(u.toObject()) })
}

/** POST /api/admin/kyc/:id/reject { reason, docs: [keys to retake] } */
export async function rejectKyc(req, res) {
  assertId(req.params.id, 'User')
  const u = await User.findById(req.params.id)
  if (!u) throw ApiError.notFound('User not found.')
  const { reason, docs } = req.body
  if (docs.length) {
    await Document.updateMany({ user: u._id, key: { $in: docs } }, { status: 'rejected', reason })
  }
  u.kyc = { ...u.kyc.toObject(), status: 'rejected', reason, reviewedAt: new Date(), reviewedBy: req.admin._id }
  await u.save()
  emitToUser(String(u._id), 'me:changed')
  syncAdmins(['kyc', 'users'])
  await notify(u._id, 'Documents need attention', reason, { screen: 'KycStatus' })
  res.json({ success: true, user: userRow(u.toObject()) })
}

/** GET /api/admin/documents/:id/file?token=: streams a private KYC file to admins only. */
export async function documentFile(req, res) {
  assertId(req.params.id, 'Document')
  const d = await Document.findById(req.params.id).lean()
  if (!d) throw ApiError.notFound('Document not found.')
  const file = absolutePath(d.file)
  if (!fs.existsSync(file)) throw ApiError.notFound('File is missing on the server.')
  res.set('Cache-Control', 'private, max-age=300')
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.sendFile(file)
}

/* ----------------------------------------------------------- Admin users */

export async function listAdmins(req, res) {
  const items = await Admin.find().sort({ createdAt: 1 }).lean()
  res.json({ success: true, items: items.map(adminOut) })
}

export async function createAdmin(req, res) {
  const { password, ...data } = req.body
  if (!password) throw ApiError.validation('Set a password.', { password: 'Use at least 8 characters.' })
  if (await Admin.exists({ email: data.email })) throw ApiError.conflict('An admin with this email already exists.')
  const a = await Admin.create({ ...data, passwordHash: await bcrypt.hash(password, 12) })
  res.status(201).json({ success: true, admin: adminOut(a) })
}

export async function updateAdmin(req, res) {
  assertId(req.params.id, 'Admin')
  const a = await Admin.findById(req.params.id)
  if (!a) throw ApiError.notFound('Admin not found.')
  const { password, ...data } = req.body
  if (String(a._id) === String(req.admin._id) && (data.active === false || data.role === 'staff')) {
    throw ApiError.badRequest('You cannot disable or demote yourself.')
  }
  a.set(data)
  if (password) a.passwordHash = await bcrypt.hash(password, 12)
  await a.save()
  res.json({ success: true, admin: adminOut(a) })
}
