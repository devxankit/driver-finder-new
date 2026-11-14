/**
 * Server-side translation of fixed texts (push notifications) with the app's
 * own dictionaries: mobile-app/src/i18n/generated/<lang>.json, built by
 * `npm run i18n` from every server message and hand-corrected in
 * overrides.json. They hold whole sentences and patterns like
 * `{0} applied for "{1}".`, so "Ravi applied for "Truck driver"." becomes
 * `Ravi ने "Truck driver" के लिए आवेदन किया।` without calling the translator.
 *
 * Names and job titles in the {0}/{1} slots are kept as written.
 * Returns null when the dictionary has no match (the caller falls back to
 * the machine translator, then to English).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../mobile-app/src/i18n/generated')
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** lang -> { exact: Map, patterns: [{ re, slots, out }] } */
const cache = new Map()

function load(lang) {
  if (cache.has(lang)) return cache.get(lang)
  let dict = null
  try {
    const auto = JSON.parse(fs.readFileSync(path.join(DIR, `${lang}.json`), 'utf8')).auto ?? {}
    const exact = new Map(Object.entries(auto))
    const patterns = Object.entries(auto)
      .filter(([en]) => /\{\d\}/.test(en))
      .map(([en, out]) => {
        const slots = [...en.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1]))
        const re = new RegExp(`^${escape(en).replace(/\\\{\d\\\}/g, '(.+?)')}$`, 's')
        return { re, slots, out, fixed: en.replace(/\{\d\}/g, '').length }
      })
      // The most specific (longest fixed text) first.
      .sort((a, b) => b.fixed - a.fixed)
    dict = { exact, patterns }
  } catch {
    // No dictionary for this language (or English): nothing to translate with.
  }
  cache.set(lang, dict)
  return dict
}

export function translateFixed(text, lang) {
  if (!text || !lang || lang === 'en') return null
  const d = load(lang)
  if (!d) return null
  const t = text.trim()
  if (d.exact.has(t)) return d.exact.get(t)
  for (const p of d.patterns) {
    const m = t.match(p.re)
    if (!m) continue
    const values = {}
    p.slots.forEach((slot, i) => {
      const v = m[i + 1]
      // A slot that is itself a known text (e.g. a plan name) is translated too.
      values[slot] = d.exact.get(v) ?? v
    })
    return p.out.replace(/\{(\d)\}/g, (_, n) => values[n] ?? '')
  }
  return null
}

/** For tests: drop the cached dictionaries (after `npm run i18n`). */
export const reloadDictionaries = () => cache.clear()
