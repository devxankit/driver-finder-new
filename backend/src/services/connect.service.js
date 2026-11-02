import { Connection, Message } from '../models/index.js'
import { notify } from './notify.service.js'

/**
 * Creates (or re-opens) the owner-driver connection. Once connected both can
 * see each other's phone number and chat. `firstMessage` seeds the thread so
 * the chat is never empty.
 */
export async function ensureConnection({ owner, driver, source, job, by, firstMessage }) {
  let conn = await Connection.findOne({ owner: owner._id, driver: driver._id })
  const isNew = !conn
  if (!conn) {
    conn = await Connection.create({ owner: owner._id, driver: driver._id, source, job: job?._id })
  } else if (conn.status === 'closed') {
    conn.status = 'active'
    await conn.save()
  }

  if (isNew && firstMessage && by) {
    await Message.create({ connection: conn._id, sender: by._id, text: firstMessage })
    const toOwner = String(by._id) === String(driver._id)
    await Connection.updateOne(
      { _id: conn._id },
      { lastMessage: firstMessage, lastMessageAt: new Date(), $inc: toOwner ? { unreadOwner: 1 } : { unreadDriver: 1 } }
    )
  }
  return { conn, isNew }
}

export async function notifyConnected(owner, driver, initiatedByOwner) {
  if (initiatedByOwner) {
    await notify(driver._id, 'Owner connected with you', `You can now call or chat with ${owner.owner?.company || owner.name}.`, { screen: 'Chats' })
  } else {
    await notify(owner._id, 'Driver accepted', `${driver.name} accepted your hiring request. You can call or chat now.`, { screen: 'Chats' })
  }
}
