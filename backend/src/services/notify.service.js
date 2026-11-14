import { Notification } from '../models/index.js'
import { emitToUser } from './realtime.js'
import { notificationOut } from './serialize.js'
import { pushToUser } from './push.service.js'

/**
 * In-app notification for one user (the bell list, live over the socket) plus
 * a phone push (FCM) so it reaches them when the app is closed. The push is
 * sent in the background: it never delays or fails the action that caused it.
 */
export async function notify(userId, title, text, data) {
  try {
    const n = await Notification.create({ user: userId, title, text, data })
    emitToUser(String(userId), 'notification', { notification: notificationOut(n.toObject()) })
    pushToUser(userId, title, text, { ...data, notificationId: String(n._id) })
  } catch (err) {
    console.error('[notify] failed:', err.message)
  }
}
