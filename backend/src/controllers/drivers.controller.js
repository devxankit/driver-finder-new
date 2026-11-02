import User from '../models/User.js'
import Job from '../models/Job.js'
import { Application, Connection, Document, HireRequest, Shortlist, Vehicle } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId, like, paging } from '../utils/helpers.js'
import { activeSubscription, assertCanConnect } from '../services/gate.service.js'
import { driverOut, jobOut, ownerOut } from '../services/serialize.js'
import { notify } from '../services/notify.service.js'
import { ensureConnection, notifyConnected } from '../services/connect.service.js'
import { syncUsers } from '../services/realtime.js'

/**
 * The owner's relationship with each driver, in the app's DriverLink terms:
 * Connected > Request sent > Shortlisted > Not selected.
 */
async function linksFor(ownerId, driverIds = null) {
  const scope = driverIds ? { driver: { $in: driverIds } } : {}
  const [conns, reqs, shorts, apps] = await Promise.all([
    Connection.find({ owner: ownerId, ...scope }).lean(),
    HireRequest.find({ owner: ownerId, ...scope }).sort({ createdAt: 1 }).lean(),
    Shortlist.find({ owner: ownerId, ...scope }).lean(),
    Application.find({ owner: ownerId, ...scope, status: { $in: ['Shortlisted', 'Not selected'] } }).lean(),
  ])
  const links = {}
  apps.forEach((a) => (links[String(a.driver)] = a.status))
  shorts.forEach((s) => (links[String(s.driver)] = 'Shortlisted'))
  reqs.forEach((r) => {
    if (r.status === 'Pending') links[String(r.driver)] = 'Request sent'
    else if (r.status === 'Declined') links[String(r.driver)] = 'Not selected'
  })
  conns.forEach((c) => (links[String(c.driver)] = c.status === 'hired' ? 'Hired' : 'Connected'))
  return links
}

const visibleDrivers = { role: 'driver', 'kyc.status': 'approved', status: 'active', deletedAt: null }

/** GET /api/drivers?category=&city=&payType=&minExp=&q= (owner search: approved drivers only) */
export async function searchDrivers(req, res) {
  const { category, city, payType, minExp, q } = req.query
  const filter = { ...visibleDrivers }
  if (category) filter['driver.categories'] = category
  if (city) filter.city = like(city)
  if (payType === 'monthly' || payType === 'trip') filter['driver.payPref'] = { $in: [payType, 'both'] }
  if (minExp) filter['driver.experience'] = { $gte: Number(minExp) || 0 }
  if (q) filter.$or = [{ name: like(q) }, { city: like(q) }]

  const { page, limit, skip } = paging(req.query, 30)
  const [drivers, total] = await Promise.all([
    User.find(filter).sort({ 'driver.experience': -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ])
  const ids = drivers.map((d) => d._id)
  const [docs, links] = await Promise.all([Document.find({ user: { $in: ids } }).lean(), linksFor(req.user._id, ids)])
  res.json({
    success: true,
    drivers: drivers.map((d) =>
      driverOut(d, { docs: docs.filter((x) => String(x.user) === String(d._id)), link: links[String(d._id)] ?? null })
    ),
    total,
    page,
  })
}

/** GET /api/drivers/:id (owner). Phone only when connected and the owner's plan is active. */
export async function driverDetail(req, res) {
  assertId(req.params.id, 'Driver')
  const d = await User.findOne({ _id: req.params.id, role: 'driver', deletedAt: null }).lean()
  if (!d) throw ApiError.notFound('Driver not found.')
  const links = await linksFor(req.user._id, [d._id])
  const link = links[String(d._id)] ?? null
  // Unapproved drivers are visible only to owners they already applied to.
  if (d.kyc?.status !== 'approved' && !link && !(await Application.exists({ owner: req.user._id, driver: d._id }))) {
    throw ApiError.notFound('Driver not found.')
  }
  const [docs, sub, conn] = await Promise.all([
    Document.find({ user: d._id }).lean(),
    activeSubscription(req.user),
    Connection.findOne({ owner: req.user._id, driver: d._id }).lean(),
  ])
  res.json({
    success: true,
    driver: driverOut(d, { docs, link, phone: Boolean(conn && sub) }),
    connectionId: conn ? String(conn._id) : null,
  })
}

/** GET /api/owner/links: { driverId: status } for the owner's screens. */
export async function myLinks(req, res) {
  res.json({ success: true, links: await linksFor(req.user._id) })
}

/** POST /api/drivers/:id/shortlist (toggle) */
export async function toggleShortlist(req, res) {
  assertId(req.params.id, 'Driver')
  const removed = await Shortlist.findOneAndDelete({ owner: req.user._id, driver: req.params.id })
  if (!removed) {
    const d = await User.exists({ _id: req.params.id, ...visibleDrivers })
    if (!d) throw ApiError.notFound('Driver not found.')
    await Shortlist.create({ owner: req.user._id, driver: req.params.id })
  }
  res.json({ success: true, shortlisted: !removed })
}

/* --------------------------------------------------------- Hiring requests */

/** POST /api/requests { driverId, jobId?, message? } (owner; KYC + plan) */
export async function sendRequest(req, res) {
  await assertCanConnect(req.user)
  assertId(req.body.driverId, 'Driver')
  const driver = await User.findOne({ _id: req.body.driverId, ...visibleDrivers })
  if (!driver) throw ApiError.notFound('Driver not found.')

  if (await Connection.exists({ owner: req.user._id, driver: driver._id })) {
    throw ApiError.conflict('You are already connected with this driver.', 'ALREADY_CONNECTED')
  }
  if (await HireRequest.exists({ owner: req.user._id, driver: driver._id, status: 'Pending' })) {
    throw ApiError.conflict('You already sent a request to this driver.', 'ALREADY_REQUESTED')
  }
  let job = null
  if (req.body.jobId) {
    assertId(req.body.jobId, 'Job')
    job = await Job.findOne({ _id: req.body.jobId, owner: req.user._id }).lean()
  }
  const r = await HireRequest.create({ owner: req.user._id, driver: driver._id, job: job?._id, message: req.body.message ?? '' })
  syncUsers(driver._id, 'requests')
  syncUsers(req.user._id, ['requests', 'links'])
  await notify(
    driver._id,
    'Hiring request',
    `${req.user.owner?.company || req.user.name} wants to hire you${job ? ` for "${job.title}"` : ''}.`,
    { screen: 'MyJobs', tab: 'requests' }
  )
  res.status(201).json({ success: true, request: { id: String(r._id), status: r.status } })
}

/** GET /api/requests: incoming (driver) or sent (owner). */
export async function listRequests(req, res) {
  const isDriver = req.user.role === 'driver'
  const reqs = await HireRequest.find(isDriver ? { driver: req.user._id } : { owner: req.user._id }).sort({ createdAt: -1 }).limit(100).lean()
  const otherIds = reqs.map((r) => (isDriver ? r.owner : r.driver))
  const [others, jobs, counts] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).lean(),
    Job.find({ _id: { $in: reqs.map((r) => r.job).filter(Boolean) } }).lean(),
    isDriver ? Vehicle.aggregate([{ $match: { owner: { $in: otherIds } } }, { $group: { _id: '$owner', n: { $sum: 1 } } }]) : [],
  ])
  const otherBy = Object.fromEntries(others.map((u) => [String(u._id), u]))
  const jobBy = Object.fromEntries(jobs.map((j) => [String(j._id), j]))
  const vBy = Object.fromEntries(counts.map((c) => [String(c._id), c.n]))
  res.json({
    success: true,
    requests: reqs
      .filter((r) => otherBy[String(isDriver ? r.owner : r.driver)])
      .map((r) => {
        const other = otherBy[String(isDriver ? r.owner : r.driver)]
        const job = r.job ? jobBy[String(r.job)] : null
        return {
          id: String(r._id),
          status: r.status,
          message: r.message,
          at: r.createdAt.getTime(),
          ownerId: String(r.owner),
          driverId: String(r.driver),
          owner: isDriver ? ownerOut(other, { vehicles: vBy[String(other._id)] ?? 0 }) : undefined,
          driver: isDriver ? undefined : driverOut(other),
          job: job ? jobOut(job, { owner: isDriver ? other : null }) : null,
        }
      }),
  })
}

/** PATCH /api/requests/:id { accept } (driver). Accepting needs the driver's KYC + plan. */
export async function answerRequest(req, res) {
  assertId(req.params.id, 'Request')
  const r = await HireRequest.findOne({ _id: req.params.id, driver: req.user._id })
  if (!r) throw ApiError.notFound('Request not found.')
  if (r.status !== 'Pending') throw ApiError.conflict('You already answered this request.', 'ALREADY_ANSWERED')

  const owner = await User.findById(r.owner)
  if (!owner || owner.deletedAt || owner.status === 'suspended') throw ApiError.notFound('This owner is no longer available.')

  if (req.body.accept) {
    await assertCanConnect(req.user)
    const job = r.job ? await Job.findById(r.job).lean() : null
    const { isNew } = await ensureConnection({
      owner,
      driver: req.user,
      source: 'request',
      job,
      by: req.user,
      firstMessage: 'Namaste sir, I accepted your request. Please share the job details.',
    })
    r.status = 'Accepted'
    if (isNew) await notifyConnected(owner, req.user, false)
  } else {
    r.status = 'Declined'
    await notify(owner._id, 'Request declined', `${req.user.name} is not available right now.`, { screen: 'FindDrivers' })
  }
  await r.save()
  syncUsers(owner._id, ['requests', 'links', 'connections'])
  syncUsers(req.user._id, ['requests', 'connections'])
  res.json({ success: true, request: { id: String(r._id), status: r.status } })
}
