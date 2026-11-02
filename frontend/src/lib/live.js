/**
 * Admin live updates over Socket.IO. The server sends `admin:sync { what: [...] }`
 * when something changes (new KYC submission, report, payment, enquiry, job);
 * pages that show that data reload by themselves.
 */
import { io } from 'socket.io-client'
import { API_URL, tokenStore } from './api'

let socket = null
const listeners = new Set()

export function connectAdminSocket() {
  const token = tokenStore.get()
  if (!token || socket) return
  socket = io(API_URL || window.location.origin, { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] })
  socket.on('admin:sync', ({ what = [] } = {}) => listeners.forEach((l) => l(what)))
  socket.on('connect_error', () => {})
}

export function disconnectAdminSocket() {
  socket?.disconnect()
  socket = null
}

/** Calls `fn(what)` whenever the server reports changes. Returns an unsubscribe function. */
export function onAdminSync(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
