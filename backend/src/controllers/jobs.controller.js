import mongoose from 'mongoose'
import Job from '../models/Job.js'
import User from '../models/User.js'
import { Application, Document, Vehicle } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId, like, paging } from '../utils/helpers.js'
import { assertCanConnect, assertKycApproved } from '../services/gate.service.js'
import { driverOut, jobOut } from '../services/serialize.js'
import { notify } from '../services/notify.service.js'
import { ensureConnection, notifyConnected } from '../services/connect.service.js'
import { syncAdmins, syncUsers } from '../services/realtime.js'

/** Suspended or deleted owners, cached for 30 s: the feed is the busiest endpoint. */
let hiddenCache = { at: 0, ids: [] }
async function hiddenOwners() {
  if (Date.now() - hiddenCache.at < 30000) return hiddenCache.ids
  const ids = await User.find({ role: 'owner', $or: [{ status: 'suspended' }, { deletedAt: { $ne: null } }] }).distinct('_id')
  hiddenCache = { at: Date.now(), ids }
  return ids
}

/** Owners (approved, active) by id, plus their vehicle counts. */
async function ownersFor(jobs) {
  const ids = [...new Set(jobs.map((j) => String(j.owner)))]
  const [owners, counts] = await Promise.all([
    User.find({ _id: { $in: ids } }).lean(),
    Vehicle.aggregate([{ $match: { owner: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]),
  ])
  return {
    owner: Object.fromEntries(owners.map((o) => [String(o._id), o])),
    vehicles: Object.fromEntries(counts.map((c) => [String(c._id), c.n])),
  }
}

async function present(jobs, user) {
  // Owners and the driver's own applications are independent: fetch them together.
  const [{ owner, vehicles }, apps] = await Promise.all([
    ownersFor(jobs),
    user?.role === 'driver' ? Application.find({ driver: user._id, job: { $in: jobs.map((j) => j._id) } }).lean() : [],
  ])
  const appBy = Object.fromEntries(apps.map((a) => [String(a.job), a]))
  const saved = new Set((user?.saved ?? []).map(String))
  return jobs.map((j) =>
    jobOut(j, {
      owner: owner[String(j.owner)],
      ownerVehicles: vehicles[String(j.owner)] ?? 0,
      application: appBy[String(j._id)],
      saved: saved.has(String(j._id)),
    })
  )
}

/** GET /api/jobs?category=&city=&payType=&q=&page= : the driver feed (active jobs only). */
export async function feed(req, res) {
  const { category, city, payType, q } = req.query
  const filter = { status: 'active' }
  if (category) filter.category = category
  if (payType === 'monthly' || payType === 'trip') filter.payType = payType
  if (city) filter.area = like(city)
  if (q) filter.$or = [{ title: like(q) }, { area: like(q) }, { vehicle: like(q) }, { route: like(q) }]

  // Hide jobs of suspended or deleted owners.
  const hidden = await hiddenOwners()
  if (hidden.length) filter.owner = { $nin: hidden }

  const { page, limit, skip } = paging(req.query, 30)
  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ])
  res.json({ success: true, jobs: await present(jobs, req.user), total, page, pages: Math.ceil(total / limit) })
}

/** GET /api/jobs/:id */
export async function detail(req, res) {
  assertId(req.params.id, 'Job')
  const job = await Job.findById(req.params.id).lean()
  const mine = job && String(job.owner) === String(req.user._id)
  if (!job || (job.status === 'hidden' && !mine)) throw ApiError.notFound('This job is no longer available.')
  const [out] = await present([job], req.user)
  res.json({ success: true, job: out })
}

/** GET /api/jobs/saved */
export async function savedJobs(req, res) {
  const jobs = await Job.find({ _id: { $in: req.user.saved }, status: { $ne: 'hidden' } }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, jobs: await present(jobs, req.user) })
}

/** POST /api/jobs/:id/save (toggle) */
export async function toggleSave(req, res) {
  assertId(req.params.id, 'Job')
  const i = req.user.saved.findIndex((x) => String(x) === req.params.id)
  if (i >= 0) req.user.saved.splice(i, 1)
  else req.user.saved.push(req.params.id)
  await req.user.save()
  res.json({ success: true, saved: i < 0, ids: req.user.saved.map(String) })
}

/* ------------------------------------------------------------- Owner side */

/** GET /api/jobs/mine */
export async function myJobs(req, res) {
  const jobs = await Job.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, jobs: await present(jobs, req.user) })
}

/** POST /api/jobs */
export async function createJob(req, res) {
  assertKycApproved(req.user)
  const { vehicleId, ...data } = req.body
  if (vehicleId) {
    assertId(vehicleId, 'Vehicle')
    const v = await Vehicle.findOne({ _id: vehicleId, owner: req.user._id })
    if (!v) throw ApiError.notFound('Vehicle not found.')
    data.vehicleRef = v._id
  }
  const job = await Job.create({ ...data, owner: req.user._id })
  syncAdmins('jobs')
  const [out] = await present([job.toObject()], req.user)
  res.status(201).json({ success: true, job: out })
}

/** PATCH /api/jobs/:id: edit, pause, close or re-open the owner's own job. */
export async function updateJob(req, res) {
  assertId(req.params.id, 'Job')
  const job = await Job.findOne({ _id: req.params.id, owner: req.user._id })
  if (!job) throw ApiError.notFound('Job not found.')
  if (job.status === 'hidden') throw ApiError.forbidden('This job was hidden by the Driver Finder team. Please contact support.', 'JOB_HIDDEN')
  const { vehicleId, ...data } = req.body
  job.set(data)
  await job.save()
  syncUsers(req.user._id, 'jobs')
  syncAdmins('jobs')
  const [out] = await present([job.toObject()], req.user)
  res.json({ success: true, job: out })
}

/* ------------------------------------------------------------ Applications */

/** POST /api/jobs/:id/apply (driver; needs KYC + plan) */
export async function apply(req, res) {
  assertId(req.params.id, 'Job')
  await assertCanConnect(req.user)
  const job = await Job.findById(req.params.id)
  if (!job || job.status !== 'active') throw ApiError.notFound('This job is no longer accepting applications.')

  const existing = await Application.findOne({ job: job._id, driver: req.user._id })
  if (existing) throw ApiError.conflict('You have already applied for this job.', 'ALREADY_APPLIED')

  const app = await Application.create({ job: job._id, driver: req.user._id, owner: job.owner })
  await Job.updateOne({ _id: job._id }, { $inc: { applicants: 1 } })
  syncUsers(job.owner, ['jobs', 'links'])
  syncUsers(req.user._id, 'applications')
  await notify(job.owner, 'New applicant', `${req.user.name || 'A driver'} applied for "${job.title}".`, { screen: 'Applicants', jobId: String(job._id) })
  res.status(201).json({ success: true, application: { id: String(app._id), status: app.status, at: app.createdAt.getTime() } })
}

/** GET /api/applications/mine (driver): every application with its job. */
export async function myApplications(req, res) {
  const apps = await Application.find({ driver: req.user._id }).sort({ updatedAt: -1 }).lean()
  const jobs = await Job.find({ _id: { $in: apps.map((a) => a.job) } }).lean()
  const out = await present(jobs, req.user)
  const byId = Object.fromEntries(out.map((j) => [j.id, j]))
  res.json({
    success: true,
    applications: apps
      .filter((a) => byId[String(a.job)])
      .map((a) => ({ id: String(a._id), status: a.status, at: a.updatedAt.getTime(), job: byId[String(a.job)] })),
  })
}

/** GET /api/jobs/:id/applicants (owner) */
export async function applicants(req, res) {
  assertId(req.params.id, 'Job')
  const job = await Job.findOne({ _id: req.params.id, owner: req.user._id }).lean()
  if (!job) throw ApiError.notFound('Job not found.')
  const apps = await Application.find({ job: job._id }).sort({ createdAt: -1 }).lean()
  const drivers = await User.find({ _id: { $in: apps.map((a) => a.driver) }, deletedAt: null }).lean()
  const docs = await Document.find({ user: { $in: drivers.map((d) => d._id) } }).lean()
  const byId = Object.fromEntries(drivers.map((d) => [String(d._id), d]))
  res.json({
    success: true,
    applicants: apps
      .filter((a) => byId[String(a.driver)])
      .map((a) => ({
        id: String(a._id),
        status: a.status,
        at: a.createdAt.getTime(),
        driver: driverOut(byId[String(a.driver)], {
          phone: a.status === 'Connected',
          docs: docs.filter((d) => String(d.user) === String(a.driver)),
          link: a.status,
        }),
      })),
  })
}

/** PATCH /api/applications/:id { status } (owner). Connecting needs the owner's KYC + plan. */
export async function updateApplication(req, res) {
  assertId(req.params.id, 'Application')
  const app = await Application.findOne({ _id: req.params.id, owner: req.user._id })
  if (!app) throw ApiError.notFound('Application not found.')
  const { status } = req.body
  const job = await Job.findById(app.job).lean()

  if (status === 'Connected') {
    await assertCanConnect(req.user)
    const driver = await User.findById(app.driver)
    if (!driver || driver.deletedAt) throw ApiError.notFound('This driver is no longer available.')
    const { isNew } = await ensureConnection({
      owner: req.user,
      driver,
      source: 'application',
      job,
      by: req.user,
      firstMessage: `Namaste! I saw your application for "${job?.title ?? 'my job'}". Let us talk.`,
    })
    if (isNew) await notifyConnected(req.user, driver, true)
  } else if (status === 'Shortlisted' && app.status === 'Applied') {
    await notify(app.driver, 'You are shortlisted', `${req.user.owner?.company || req.user.name} shortlisted you for "${job?.title ?? 'a job'}".`, { screen: 'MyJobs' })
  }

  app.status = status
  await app.save()
  syncUsers(app.driver, ['applications', 'connections'])
  syncUsers(req.user._id, ['jobs', 'links', 'connections'])
  res.json({ success: true, application: { id: String(app._id), status: app.status } })
}
