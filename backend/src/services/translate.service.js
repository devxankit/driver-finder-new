/**
 * Machine translation for text that comes from users and the database (names,
 * job posts, chat, notifications). The app asks for a batch of strings in the
 * user's language; every result is saved, so a string is sent to the
 * translator once per language and served from MongoDB after that.
 *
 * The provider is google-translate-api-x (free, no key, unofficial: it can be
 * rate-limited or change without notice). When it fails we answer `null` for
 * that string and the app keeps showing the original text; nothing breaks. To
 * switch provider (e.g. Azure Translator), replace `callProvider` only.
 */
import crypto from 'node:crypto'
import translate from 'google-translate-api-x'
import { Translation } from '../models/index.js'

/** Languages the app offers. */
export const LANGS = ['en', 'hi', 'mr', 'gu', 'bn', 'pa', 'ta', 'te', 'kn']
export const MAX_TEXT = 2000
const CHUNK = 25
const TIMEOUT_MS = 12000
/** After a provider failure, wait this long before trying it again. */
const COOL_DOWN_MS = 45 * 1000

const idOf = (lang, text) => crypto.createHash('sha1').update(`${lang}\n${text}`).digest('hex')

async function translateWith(texts, to, from) {
  const res = await translate(texts, { to, ...(from ? { from } : {}), autoCorrect: false, rejectOnPartialFail: false })
  return (Array.isArray(res) ? res : [res]).map((r) => (r && typeof r.text === 'string' && r.text.trim() ? r.text : null))
}

/**
 * The source language is detected per text (people type in any language).
 * Detection sometimes misreads a short English line ("Tempo driver, Bhiwandi
 * city deliveries") and hands it back unchanged, so Latin-script text that
 * came back as it went in is tried once more as English.
 */
async function callProvider(texts, to) {
  const out = await translateWith(texts, to)
  if (to === 'en') return out
  const again = texts.map((t, i) => (out[i] && out[i].trim() === t && /[A-Za-z]{3}/.test(t) ? i : -1)).filter((i) => i >= 0)
  if (again.length) {
    const second = await translateWith(again.map((i) => texts[i]), to, 'en').catch(() => [])
    again.forEach((i, j) => {
      if (second[j]) out[i] = second[j]
    })
  }
  return out
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error('Translation timed out.')), ms))])

// One provider call at a time, so a busy screen never fires parallel requests at it.
let chain = Promise.resolve()
const inLine = (fn) => {
  const p = chain.then(fn, fn)
  chain = p.catch(() => {})
  return p
}

let coolUntil = 0
/** Strings being translated right now: "lang\ntext" -> promise, so two phones asking together share one call. */
const inFlight = new Map()

async function translateChunk(texts, to) {
  if (Date.now() < coolUntil) return texts.map(() => null)
  try {
    const out = await inLine(() => withTimeout(callProvider(texts, to), TIMEOUT_MS))
    const docs = texts.map((text, i) => (out[i] ? { _id: idOf(to, text), lang: to, text, out: out[i] } : null)).filter(Boolean)
    if (docs.length) {
      await Translation.bulkWrite(
        docs.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true } })),
        { ordered: false }
      ).catch(() => {})
    }
    return out
  } catch (e) {
    coolUntil = Date.now() + COOL_DOWN_MS
    console.warn(`[translate] provider failed (${to}): ${e.message}`)
    return texts.map(() => null)
  }
}

/**
 * Translates `texts` into `to`. Returns an array of the same length: the
 * translation, or null when it is not available right now.
 */
export async function translateMany(texts, to) {
  const out = new Array(texts.length).fill(null)
  if (!LANGS.includes(to)) return out

  const clean = texts.map((t) => (typeof t === 'string' ? t.trim() : ''))
  const wanted = [...new Set(clean.filter((t) => t && t.length <= MAX_TEXT))]
  if (!wanted.length) return out

  const known = new Map()
  const saved = await Translation.find({ _id: { $in: wanted.map((t) => idOf(to, t)) } }, { text: 1, out: 1 }).lean()
  for (const s of saved) known.set(s.text, s.out)

  const missing = wanted.filter((t) => !known.has(t))
  const waits = []
  const fresh = []
  for (const t of missing) {
    const running = inFlight.get(`${to}\n${t}`)
    if (running) waits.push(running.then((v) => v && known.set(t, v)))
    else fresh.push(t)
  }
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const chunk = fresh.slice(i, i + CHUNK)
    const p = translateChunk(chunk, to)
    chunk.forEach((t, j) => {
      const one = p.then((r) => r[j])
      inFlight.set(`${to}\n${t}`, one)
      one.finally(() => inFlight.delete(`${to}\n${t}`))
      waits.push(one.then((v) => v && known.set(t, v)))
    })
  }
  await Promise.all(waits)

  clean.forEach((t, i) => {
    out[i] = known.get(t) ?? null
  })
  return out
}
