/**
 * Socket.IO: live updates for the app and the admin panel.
 *
 * Every socket proves who it is with the same JWT the REST API uses
 * (`auth: { token }`). App users join `user:<id>`, admins join `admins`.
 * Writes still go through REST (validation, plan checks); controllers call
 * emitToUser / emitToAdmins afterwards so the other side updates instantly.
 *
 * Events to the app:
 *   message:new   { connectionId, message }         chat message (both sides)
 *   chat:typing   { connectionId, userId, typing }
 *   chat:read     { connectionId, by, at }          the other side read up to `at`
 *   presence      { userId, online, lastSeenAt }
 *   notification  { notification }                 new inbox item
 *   me:changed    {}                                profile/KYC/plan changed -> refetch /me
 *   sync          { what: [...] }                   lists to refetch: applications, requests, connections, jobs, links, vehicles
 * Events to admins:
 *   admin:sync    { what: [...] }                   kyc, users, reports, payments, jobs, enquiries
 */
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { Admin, Connection } from '../models/index.js'

let io = null
/** userId -> number of open sockets (a user can be on two phones). */
const online = new Map()

export const isOnline = (userId) => (online.get(String(userId)) ?? 0) > 0

export function emitToUser(userId, event, data = {}) {
  if (io && userId) io.to(`user:${userId}`).emit(event, data)
}

export function emitToAdmins(event, data = {}) {
  if (io) io.to('admins').emit(event, data)
}

/** Tell a user (or several) which lists changed. */
export function syncUsers(userIds, what) {
  for (const id of [].concat(userIds)) emitToUser(id, 'sync', { what: [].concat(what) })
}

export const syncAdmins = (what) => emitToAdmins('admin:sync', { what: [].concat(what) })

/** The other party of every connection, so presence goes only to people who can see it. */
async function contactsOf(userId) {
  const conns = await Connection.find({ $or: [{ owner: userId }, { driver: userId }] })
    .select('owner driver')
    .lean()
  return conns.map((c) => (String(c.owner) === String(userId) ? String(c.driver) : String(c.owner)))
}

async function broadcastPresence(userId, isOn) {
  const contacts = await contactsOf(userId).catch(() => [])
  const payload = { userId: String(userId), online: isOn, lastSeenAt: Date.now() }
  for (const c of contacts) emitToUser(c, 'presence', payload)
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: (origin, cb) => cb(null, !origin || env.clientUrls.includes(origin)) },
    // Mobile networks drop quietly; detect dead sockets within ~45 s.
    pingInterval: 20000,
    pingTimeout: 25000,
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token
      const payload = jwt.verify(String(token || ''), env.jwtSecret)
      if (payload.kind === 'user') {
        const user = await User.findById(payload.id).select('status deletedAt role').lean()
        if (!user || user.deletedAt || user.status === 'suspended') return next(new Error('UNAUTHORIZED'))
        socket.data = { kind: 'user', id: String(payload.id), role: user.role }
      } else if (payload.kind === 'admin') {
        const admin = await Admin.findById(payload.id).select('active').lean()
        if (!admin?.active) return next(new Error('UNAUTHORIZED'))
        socket.data = { kind: 'admin', id: String(payload.id) }
      } else {
        return next(new Error('UNAUTHORIZED'))
      }
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', (socket) => {
    const { kind, id } = socket.data

    if (kind === 'admin') {
      socket.join('admins')
      return
    }

    socket.join(`user:${id}`)
    const n = (online.get(id) ?? 0) + 1
    online.set(id, n)
    if (n === 1) broadcastPresence(id, true)

    /** Is this user part of the connection? Cached per socket. */
    const allowed = new Map()
    const canUse = async (connectionId) => {
      if (allowed.has(connectionId)) return allowed.get(connectionId)
      const c = await Connection.findOne({ _id: connectionId, $or: [{ owner: id }, { driver: id }] })
        .select('owner driver')
        .lean()
        .catch(() => null)
      const other = c ? (String(c.owner) === id ? String(c.driver) : String(c.owner)) : null
      allowed.set(connectionId, other)
      return other
    }

    socket.on('chat:typing', async ({ connectionId, typing } = {}) => {
      const other = connectionId && (await canUse(String(connectionId)))
      if (other) emitToUser(other, 'chat:typing', { connectionId, userId: id, typing: !!typing })
    })

    // The app asks whether the other person is online when a chat opens.
    socket.on('presence:get', async ({ userId } = {}, ack) => {
      if (typeof ack !== 'function' || !userId) return
      const u = await User.findById(userId).select('lastSeenAt').lean().catch(() => null)
      ack({ userId, online: isOnline(userId), lastSeenAt: u?.lastSeenAt ? new Date(u.lastSeenAt).getTime() : null })
    })

    socket.on('disconnect', () => {
      const left = (online.get(id) ?? 1) - 1
      if (left <= 0) {
        online.delete(id)
        User.updateOne({ _id: id }, { lastSeenAt: new Date() }).catch(() => {})
        broadcastPresence(id, false)
      } else {
        online.set(id, left)
      }
    })
  })

  return io
}
