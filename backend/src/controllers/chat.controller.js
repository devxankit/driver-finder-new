import User from '../models/User.js'
import Job from '../models/Job.js'
import { Connection, Message } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { assertId } from '../utils/helpers.js'
import { activeSubscription, assertCanConnect } from '../services/gate.service.js'
import { driverOut, ownerOut } from '../services/serialize.js'
import { notify } from '../services/notify.service.js'
import { emitToUser, isOnline, syncUsers } from '../services/realtime.js'

const side = (user) => (user.role === 'owner' ? 'owner' : 'driver')
const ms = (d) => (d ? new Date(d).getTime() : null)

async function myConnection(req) {
  assertId(req.params.id, 'Chat')
  const conn = await Connection.findOne({ _id: req.params.id, [side(req.user)]: req.user._id })
  if (!conn) throw ApiError.notFound('Chat not found.')
  return conn
}

/**
 * GET /api/connections: chat list. Each item carries the other party (phone
 * only while this user's plan is active), unread count, presence and read receipt.
 */
export async function listConnections(req, res) {
  const me = side(req.user)
  const other = me === 'owner' ? 'driver' : 'owner'
  const [conns, sub] = await Promise.all([
    Connection.find({ [me]: req.user._id }).sort({ lastMessageAt: -1, updatedAt: -1 }).lean(),
    activeSubscription(req.user),
  ])
  const [people, jobs] = await Promise.all([
    User.find({ _id: { $in: conns.map((c) => c[other]) } }).lean(),
    Job.find({ _id: { $in: conns.map((c) => c.job).filter(Boolean) } }).select('title').lean(),
  ])
  const by = Object.fromEntries(people.map((p) => [String(p._id), p]))
  const jobBy = Object.fromEntries(jobs.map((j) => [String(j._id), j.title]))
  res.json({
    success: true,
    connections: conns
      .filter((c) => by[String(c[other])])
      .map((c) => {
        const p = by[String(c[other])]
        return {
          id: String(c._id),
          otherId: String(p._id),
          other: other === 'owner' ? ownerOut(p, { phone: Boolean(sub) }) : driverOut(p, { phone: Boolean(sub) }),
          jobTitle: c.job ? jobBy[String(c.job)] ?? null : null,
          source: c.source,
          status: c.status,
          lastMessage: c.lastMessage,
          lastMessageAt: ms(c.lastMessageAt) ?? ms(c.createdAt),
          unread: me === 'owner' ? c.unreadOwner : c.unreadDriver,
          otherReadAt: ms(me === 'owner' ? c.readAtDriver : c.readAtOwner),
          online: isOnline(p._id),
          lastSeenAt: ms(p.lastSeenAt),
          at: ms(c.createdAt),
        }
      }),
  })
}

const msgOut = (m, userId) => ({
  id: String(m._id),
  from: String(m.sender) === String(userId) ? 'me' : 'them',
  text: m.text,
  at: new Date(m.createdAt).getTime(),
})

/** Marks the thread read for this user and tells the other side (read ticks). */
async function markRead(conn, user) {
  const mine = side(user)
  const unreadField = mine === 'owner' ? 'unreadOwner' : 'unreadDriver'
  const readField = mine === 'owner' ? 'readAtOwner' : 'readAtDriver'
  const now = new Date()
  await Connection.updateOne({ _id: conn._id }, { [unreadField]: 0, [readField]: now })
  const otherId = mine === 'owner' ? conn.driver : conn.owner
  emitToUser(String(otherId), 'chat:read', { connectionId: String(conn._id), by: String(user._id), at: now.getTime() })
  if (conn[unreadField]) syncUsers(user._id, 'connections')
}

/**
 * GET /api/connections/:id/messages?after=<ms>&before=<ms>&limit=
 * Newest page first load; `before` loads older history; `after` catches up after a reconnect.
 */
export async function listMessages(req, res) {
  const conn = await myConnection(req)
  const after = Number(req.query.after) || 0
  const before = Number(req.query.before) || 0
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 60))
  const filter = { connection: conn._id }
  if (after) filter.createdAt = { $gt: new Date(after) }
  else if (before) filter.createdAt = { $lt: new Date(before) }

  let msgs
  if (after) {
    msgs = await Message.find(filter).sort({ createdAt: 1 }).limit(500).lean()
  } else {
    msgs = (await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean()).reverse()
  }
  await markRead(conn, req.user)
  const mine = side(req.user)
  res.json({
    success: true,
    messages: msgs.map((m) => msgOut(m, req.user._id)),
    hasMore: !after && msgs.length === limit,
    otherReadAt: ms(mine === 'owner' ? conn.readAtDriver : conn.readAtOwner),
  })
}

/** POST /api/connections/:id/read: the open chat saw new messages that arrived live. */
export async function readConnection(req, res) {
  const conn = await myConnection(req)
  await markRead(conn, req.user)
  res.json({ success: true })
}

/** POST /api/connections/:id/messages { text }: chatting needs an active plan. */
export async function sendMessage(req, res) {
  const conn = await myConnection(req)
  await assertCanConnect(req.user)
  if (conn.status === 'closed') throw ApiError.conflict('This chat is closed.', 'CHAT_CLOSED')
  const m = await Message.create({ connection: conn._id, sender: req.user._id, text: req.body.text })
  const toOwner = side(req.user) === 'driver'
  const recipient = toOwner ? conn.owner : conn.driver
  await Connection.updateOne(
    { _id: conn._id },
    {
      lastMessage: req.body.text.slice(0, 140),
      lastMessageAt: m.createdAt,
      // Sending also means the sender has read everything before it.
      ...(toOwner ? { readAtDriver: m.createdAt, unreadDriver: 0 } : { readAtOwner: m.createdAt, unreadOwner: 0 }),
      $inc: toOwner ? { unreadOwner: 1 } : { unreadDriver: 1 },
    }
  )

  // Live delivery: the recipient sees it as "them", the sender's other devices as "me".
  const payload = { connectionId: String(conn._id), lastMessageAt: m.createdAt.getTime() }
  emitToUser(String(recipient), 'message:new', { ...payload, message: msgOut(m, recipient) })
  emitToUser(String(req.user._id), 'message:new', { ...payload, message: msgOut(m, req.user._id) })

  // Inbox notification only when the recipient is not online and had nothing unread (one per burst).
  if (!isOnline(recipient) && (toOwner ? conn.unreadOwner : conn.unreadDriver) === 0) {
    const pref = await User.findById(recipient).select('prefs').lean()
    if (pref?.prefs?.chats !== false) {
      await notify(recipient, `New message from ${req.user.name || 'Driver Finder user'}`, req.body.text.slice(0, 100), { screen: 'Chat', connectionId: String(conn._id) })
    }
  }
  res.status(201).json({ success: true, message: msgOut(m, req.user._id) })
}

/** PATCH /api/connections/:id { status: 'hired' | 'closed' | 'active' } (owner marks a driver hired). */
export async function updateConnection(req, res) {
  const conn = await myConnection(req)
  if (req.user.role !== 'owner') throw ApiError.forbidden('Only the owner can change this.')
  const { status } = req.body
  if (!['active', 'hired', 'closed'].includes(status)) throw ApiError.badRequest('Invalid status.')
  conn.status = status
  await conn.save()
  if (status === 'hired') await notify(conn.driver, 'You are hired!', `${req.user.owner?.company || req.user.name} marked you as hired. All the best!`, { screen: 'MyJobs' })
  syncUsers([conn.owner, conn.driver], ['connections', 'links'])
  res.json({ success: true })
}
