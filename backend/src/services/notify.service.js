import { Notification } from '../models/index.js'
import { emitToUser } from './realtime.js'
import { notificationOut } from './serialize.js'

/**
 * In-app notification for one user. Push (FCM) plugs in here later.
 * Never throws: a failed notification must not fail the action that caused it.
 */
export async function notify(userId, title, text, data) {
  try {
    const n = await Notification.create({ user: userId, title, text, data })
    emitToUser(String(userId), 'notification', { notification: notificationOut(n.toObject()) })
  } catch (err) {
    console.error('[notify] failed:', err.message)
  }
}
