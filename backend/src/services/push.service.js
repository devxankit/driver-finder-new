/**
 * Phone push notifications through Firebase Cloud Messaging (FCM).
 *
 * The app registers its FCM token after sign-in (POST /api/me/push-token) and
 * removes it at sign-out. notify() calls pushToUser() for every in-app
 * notification, so the user hears about a new applicant, a hiring request or
 * a chat message even when the app is closed. The text is translated into
 * the user's language first (cached, falls back to English).
 *
 * Setup: FIREBASE_SERVICE_ACCOUNT = path to the service-account JSON
 * (Firebase console -> Project settings -> Service accounts). Without it,
 * push is off and everything else keeps working.
 *
 * Never throws: a failed push must not fail the action that caused it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { translateMany } from './translate.service.js'
import { translateFixed } from './i18n.service.js'

let messaging = null
let tried = false

function client() {
  if (tried) return messaging
  tried = true
  const file = env.firebase.serviceAccount
  if (!file) return null
  try {
    const sa = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'))
    messaging = getMessaging(initializeApp({ credential: cert(sa) }, 'driver-finder'))
    console.log(`[push] Firebase ready (${sa.project_id})`)
  } catch (e) {
    console.warn(`[push] Firebase not configured: ${e.message}`)
  }
  return messaging
}

export const isPushConfigured = () => Boolean(client())

/** Tokens FCM will never accept again: remove them from the user. */
const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])

/** All data values must be strings for FCM. */
const strings = (o = {}) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))

/**
 * Title and text in the user's language: the app's dictionaries first (every
 * fixed server message, hand-checked), then the cached machine translator for
 * free text (chat messages, admin broadcasts), English only if both fail.
 */
export async function localise(lang, title, text) {
  if (!lang || lang === 'en') return [title, text]
  const fixed = [translateFixed(title, lang), translateFixed(text, lang)]
  const todo = [title, text].filter((s, i) => !fixed[i] && s)
  const machine = todo.length ? await translateMany(todo, lang).catch(() => todo.map(() => null)) : []
  const pick = (s, i) => fixed[i] ?? (s ? machine[todo.indexOf(s)] : null) ?? s
  let out = [pick(title, 0), pick(text, 1)]
  // Job titles in quotes ("Truck driver, Bhiwandi") in the user's language too; names stay as written.
  const quoted = [...new Set(out.flatMap((s) => [...(s ?? '').matchAll(/"([^"]{2,120})"/g)].map((m) => m[1])).filter((q) => /[A-Za-z]{3}/.test(q)))]
  if (quoted.length) {
    const tr = await translateMany(quoted, lang).catch(() => quoted.map(() => null))
    out = out.map((s) => (s ? s.replace(/"([^"]{2,120})"/g, (all, q) => (tr[quoted.indexOf(q)] ? `"${tr[quoted.indexOf(q)]}"` : all)) : s))
  }
  return out
}

async function sendTo(tokens, { title, text, data }) {
  // Data-only: the app builds the notification itself (PushService.kt) so it can show the
  // full-colour logo beside the text, which FCM's own notifications cannot do.
  const res = await client().sendEachForMulticast({
    tokens,
    data: strings({ ...data, dfTitle: title, dfBody: text }),
    android: {
      priority: 'high',
      ttl: 3 * 24 * 3600 * 1000,
      collapseKey: data?.connectionId ? `chat-${data.connectionId}` : undefined,
    },
  })
  return res.responses.map((r, i) => (r.success ? null : DEAD.has(r.error?.code) ? tokens[i] : null)).filter(Boolean)
}

async function dropTokens(dead) {
  if (dead.length) await User.updateMany({ 'pushTokens.token': { $in: dead } }, { $pull: { pushTokens: { token: { $in: dead } } } })
}

/** Push one notification to every phone of one user. */
export async function pushToUser(userId, title, text, data = {}) {
  try {
    if (!client()) return
    const u = await User.findById(userId).select('pushTokens lang status deletedAt').lean()
    const tokens = (u?.pushTokens ?? []).map((t) => t.token)
    if (!tokens.length || u.deletedAt || u.status === 'suspended') return
    const [t, x] = await localise(u.lang, title, text)
    await dropTokens(await sendTo(tokens, { title: t, text: x, data }))
  } catch (e) {
    console.warn('[push] failed:', e.message)
  }
}

/** Admin broadcast: one push per language group, 500 tokens per FCM call. */
export async function pushToMany(userFilter, title, text, data = {}) {
  try {
    if (!client()) return 0
    const users = await User.find({ ...userFilter, 'pushTokens.0': { $exists: true } }).select('pushTokens lang').lean()
    const byLang = new Map()
    for (const u of users) {
      const list = byLang.get(u.lang || 'hi') ?? []
      list.push(...u.pushTokens.map((t) => t.token))
      byLang.set(u.lang || 'hi', list)
    }
    let sent = 0
    for (const [lang, tokens] of byLang) {
      const [t, x] = await localise(lang, title, text)
      for (let i = 0; i < tokens.length; i += 500) {
        const batch = tokens.slice(i, i + 500)
        await dropTokens(await sendTo(batch, { title: t, text: x, data }))
        sent += batch.length
      }
    }
    return sent
  } catch (e) {
    console.warn('[push] broadcast failed:', e.message)
    return 0
  }
}
