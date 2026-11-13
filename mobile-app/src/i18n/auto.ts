/**
 * Translates everything the app shows into the chosen language.
 *
 * `T` (the app's text component) passes each piece of text through `tx()`:
 *
 *  1. Dictionary. Fixed app text, the server's messages and the admin's lists
 *     (cities, vehicle types, plans) are translated ahead of time into
 *     `generated/<lang>.json` by `npm run i18n` and looked up by their English
 *     text. Instant and works offline.
 *  2. Patterns. Text built from parts ("{0} drivers near you", a job title)
 *     matches a translated pattern; each part is translated on its own.
 *  3. Server. Anything else, i.e. what people typed or what comes from the
 *     database (names, job details, chat, notifications), is sent to
 *     POST /api/translate in small batches. The original shows until the answer
 *     arrives; answers are kept on the phone, so each text is asked once.
 *
 * Text already written in the chosen language, numbers, phone numbers and
 * vehicle numbers are left alone. If the server can't translate, the original
 * stays on screen.
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './index';
import { GENERATED, SOURCES } from './generated';
import { api, hasToken } from '../api/client';

/* ------------------------------------------------------------------ scripts */

const RANGE: Record<string, RegExp> = {
  hi: /[ऀ-ॿ]/,
  mr: /[ऀ-ॿ]/,
  bn: /[ঀ-৿]/,
  pa: /[਀-੿]/,
  gu: /[઀-૿]/,
  ta: /[஀-௿]/,
  te: /[ఀ-౿]/,
  kn: /[ಀ-೿]/,
};
const LATIN = /[A-Za-z]/;
const INDIC = /[ऀ-ൿ]/;
const VEHICLE_NO = /^[A-Za-z]{2}[ -]?\d{1,2}[ -]?[A-Za-z]{0,3}[ -]?\d{3,4}$/;
const CODE = /^[A-Z0-9]{1,4}$/;
const LINKISH = /^(https?:\/\/|www\.)|@[\w-]+\./i;
const DATE = /^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)( \d{4})?$/;
/** "5m", "3h", "2d": short time stamps. */
const SHORT_UNIT = /^\d+\s?[a-z]{1,2}$/i;
/** Never translated: the product name (with or without the version). */
const KEEP = /^Driver Finder( \d[\d.]*)?$/;
const MAX_SERVER_TEXT = 1800;

/** Does this text need the server for language `lang`? */
function needsServer(text: string, lang: string): boolean {
  if (text.length < 2 || text.length > MAX_SERVER_TEXT) return false;
  if (KEEP.test(text) || VEHICLE_NO.test(text) || CODE.test(text) || LINKISH.test(text) || SHORT_UNIT.test(text)) return false;
  if (lang === 'en') return INDIC.test(text);
  if (RANGE[lang]?.test(text)) return false; // already in the chosen language
  return LATIN.test(text) || INDIC.test(text);
}

/* ---------------------------------------------------------------- patterns */

type Pattern = { source: string; fixed: string; re: RegExp };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "{0} drivers near you" -> /^(.+?) drivers near you$/, longest fixed text first. */
const PATTERNS: Pattern[] = SOURCES.filter((s) => /\{\d+\}/.test(s))
  .map((source) => {
    const fixed = source.replace(/\{\d+\}/g, '');
    return { source, fixed, re: new RegExp(`^${source.split(/\{\d+\}/).map(escapeRe).join('([\\s\\S]+?)')}$`) };
  })
  .filter((p) => (p.fixed.match(/[A-Za-z]/g) ?? []).length >= 2)
  .sort((a, b) => b.fixed.length - a.fixed.length);

/** The order the placeholders appear in, e.g. "{1} of {0}" -> [1, 0]. */
const slots = (s: string) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));

/* ------------------------------------------------------------------- state */

let lang = i18n.language || 'en';
let version = 0;
const listeners = new Set<() => void>();
/** Final results for the current language. */
let memo = new Map<string, string>();
/** Which pattern (if any) a text matches; the same for every language. */
const plans = new Map<string, { p: Pattern; parts: string[] } | null>();
/** Whether a sentence joined from several children is best translated as one (per language). */
const wholes = new Map<string, boolean>();
/** Server answers, per language. */
const fetched: Record<string, Map<string, string>> = {};
const asked = new Set<string>();
const failedAt = new Map<string, number>();
let queue = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let waiters: (() => void)[] = [];

const STORE_KEY = (l: string) => `df.tx.${l}`;
const MAX_KEPT = 3000;
const RETRY_MS = 30 * 1000;
const BATCH = 40;

function bump() {
  version++;
  memo = new Map();
  listeners.forEach((fn) => fn());
  const w = waiters;
  waiters = [];
  w.forEach((fn) => fn());
}

function answers(l: string) {
  return (fetched[l] ??= new Map());
}

async function restore(l: string) {
  if (fetched[l]) return;
  const map = answers(l);
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY(l));
    if (raw) for (const [k, v] of JSON.parse(raw) as [string, string][]) if (!map.has(k)) map.set(k, v);
  } catch {
    // start empty
  }
  if (l === lang) bump();
}

function saveSoon(l: string) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const entries = [...answers(l)];
    AsyncStorage.setItem(STORE_KEY(l), JSON.stringify(entries.slice(-MAX_KEPT))).catch(() => {});
  }, 1500);
}

i18n.on('languageChanged', (l) => {
  lang = l || 'en';
  queue = new Set();
  asked.clear();
  failedAt.clear();
  restore(lang);
  bump();
});
restore(lang);

/* ------------------------------------------------------------------ server */

function ask(text: string) {
  const key = `${lang}\n${text}`;
  if (asked.has(key)) return;
  const failed = failedAt.get(key);
  if (failed && Date.now() - failed < RETRY_MS) return;
  if (!hasToken()) return; // signed-out screens only have fixed text
  asked.add(key);
  queue.add(text);
  if (!flushTimer) flushTimer = setTimeout(flush, 70);
}

async function flush() {
  flushTimer = null;
  const l = lang;
  const all = [...queue];
  queue = new Set();
  for (let i = 0; i < all.length; i += BATCH) {
    const texts = all.slice(i, i + BATCH);
    let got: (string | null)[] = [];
    try {
      got = (await api<{ translations: (string | null)[] }>('/translate', { method: 'POST', body: { to: l, texts }, timeout: 25000 })).translations;
    } catch {
      got = [];
    }
    const map = answers(l);
    texts.forEach((t, j) => {
      const key = `${l}\n${t}`;
      asked.delete(key);
      if (got[j]) map.set(t, got[j]!);
      else failedAt.set(key, Date.now());
    });
    if (l === lang) {
      saveSoon(l);
      bump();
    }
  }
  if (queue.size && !flushTimer) flushTimer = setTimeout(flush, 70);
}

/* --------------------------------------------------------------- translate */

/** `pending` is set when part of the result is still being fetched. */
type Out = { text: string; pending: boolean };

function core(text: string): Out {
  const done = memo.get(text);
  if (done !== undefined) return { text: done, pending: false };
  const finish = (out: Out) => {
    if (!out.pending) memo.set(text, out.text);
    return out;
  };
  // Dates ("29 Nov 2026", "29 Nov"): only the month changes.
  const date = DATE.exec(text);
  if (date && lang !== 'en') {
    const month = GENERATED[lang]?.auto[date[2]];
    if (month) return finish({ text: `${date[1]} ${month}${date[3] ?? ''}`, pending: false });
  }
  // Vehicle numbers and the product name read the same in every language.
  if (VEHICLE_NO.test(text) || KEEP.test(text)) return finish({ text, pending: false });
  const dict = GENERATED[lang]?.auto;

  // 1. Dictionary
  if (dict) {
    const hit = dict[text];
    if (hit) return finish({ text: hit, pending: false });
  }

  // 2. Several lines: each line on its own (long help and legal text).
  if (text.includes('\n')) {
    let pending = false;
    const lines = text.split('\n').map((line) => {
      const r = any(line);
      pending = pending || r.pending;
      return r.text;
    });
    return finish({ text: lines.join('\n'), pending });
  }

  // 3. Patterns
  if (lang !== 'en' && dict) {
    let plan = plans.get(text);
    if (plan === undefined) {
      plan = null;
      for (const p of PATTERNS) {
        const m = p.re.exec(text);
        if (m) {
          plan = { p, parts: m.slice(1) };
          break;
        }
      }
      plans.set(text, plan);
    }
    const translated = plan && dict[plan.p.source];
    if (plan && translated) {
      // The n-th captured part belongs to the n-th placeholder of the English pattern.
      const order = slots(plan.p.source);
      const byIndex = new Map<number, Out>();
      plan.parts.forEach((part, n) => byIndex.set(order[n], any(part)));
      let pending = false;
      const out = translated.replace(/\{(\d+)\}/g, (_, i) => {
        const r = byIndex.get(Number(i));
        if (r?.pending) pending = true;
        return r ? r.text : '';
      });
      return finish({ text: out, pending });
    }
  }

  // 4. Lists whose items are all known: "Jaipur, Thane", "LMV + HMV", "Pune → Ahmedabad".
  if (lang !== 'en' && dict) {
    for (const sep of LIST_SEPARATORS) {
      if (!text.includes(sep)) continue;
      const items = text.split(sep);
      if (items.every((it) => local(it.trim()))) {
        return finish({ text: items.map((it) => any(it).text).join(sep), pending: false });
      }
    }
  }

  // 5. Server
  if (needsServer(text, lang)) {
    const got = answers(lang).get(text);
    if (got) return finish({ text: got, pending: false });
    ask(text);
    return { text, pending: true };
  }
  return finish({ text, pending: false });
}

const LIST_SEPARATORS = [', ', ' · ', ' + ', ' → ', ' ⇄ ', ' / '];

/** Can this text be shown without asking the server? */
function local(text: string): boolean {
  if (!text) return true;
  if (GENERATED[lang]?.auto[text]) return true;
  return !needsServer(text, lang);
}

/**
 * How much of a text the dictionaries cover: the number of fixed characters
 * matched (a whole entry, or the fixed part of a pattern plus its parts).
 */
function coverage(text: string, depth = 0): number {
  const s = text.trim();
  if (!s) return 0;
  const dict = GENERATED[lang]?.auto;
  if (!dict) return 0;
  if (dict[s]) return s.length;
  if (depth > 2) return 0;
  for (const p of PATTERNS) {
    if (!dict[p.source]) continue;
    const m = p.re.exec(s);
    if (m) return p.fixed.length + m.slice(1).reduce((n, part) => n + coverage(part, depth + 1), 0);
  }
  return 0;
}

/** Translates the text but keeps the spaces around it. */
function any(text: string): Out {
  const trimmed = text.trim();
  if (!trimmed) return { text, pending: false };
  if (trimmed === text) return core(text);
  const start = text.indexOf(trimmed);
  const r = core(trimmed);
  return { text: text.slice(0, start) + r.text + text.slice(start + trimmed.length), pending: r.pending };
}

/** Text in the chosen language (the original while a server answer is on its way). */
export function tx(text: string | null | undefined): string {
  if (!text) return text ?? '';
  return any(text).text;
}

/** For chat: the translation plus whether it differs from what was typed. */
export function txInfo(text: string): { text: string; translated: boolean } {
  const out = any(text).text;
  return { text: out, translated: out !== text };
}

/**
 * Children of a text component: strings are translated, numbers and elements
 * are kept. "Step {n} of 3" style children are joined first so the whole
 * sentence can match a pattern.
 */
export function txChildren(children: unknown): unknown {
  if (typeof children === 'string') return tx(children);
  if (!Array.isArray(children)) return children;
  const flat = children.every((c) => c == null || typeof c === 'boolean' || typeof c === 'string' || typeof c === 'number');
  if (flat) {
    const joined = children.map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : '')).join('');
    const trimmed = joined.trim();
    if (!trimmed) return joined;
    const dict = GENERATED[lang]?.auto;
    // Whole sentence known (exactly or as a pattern): use it.
    if (dict?.[trimmed] || memo.has(trimmed)) return any(joined).text;
    if (lang !== 'en' && dict) {
      // "{n} drivers near you" reads best as one sentence; "{city}{' · Plan: 17 days left'}"
      // is two separate pieces. Use whichever the dictionaries cover more of.
      const key = `${lang}\n${trimmed}`;
      let whole = wholes.get(key);
      if (whole === undefined) {
        const asWhole = coverage(trimmed);
        const asPieces = children.reduce((n: number, c) => n + (typeof c === 'string' ? coverage(c) : 0), 0);
        whole = asWhole > 0 && asWhole >= asPieces;
        wholes.set(key, whole);
      }
      if (whole) return any(joined).text;
    }
  }
  // Otherwise each piece on its own.
  return children.map((c) => (typeof c === 'string' ? tx(c) : Array.isArray(c) ? txChildren(c) : c));
}

/** Translations for an alert: waits briefly for the server so the alert is not shown half-translated. */
export async function txReady(texts: (string | undefined)[], waitMs = 2500): Promise<(string | undefined)[]> {
  const run = () => {
    let pending = false;
    const out = texts.map((t) => {
      if (!t) return t;
      const r = any(t);
      pending = pending || r.pending;
      return r.text;
    });
    return { out, pending };
  };
  let r = run();
  const until = Date.now() + waitMs;
  while (r.pending && Date.now() < until) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, Math.max(50, until - Date.now()));
      waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    r = run();
  }
  return r.out;
}

/* -------------------------------------------------------------------- hook */

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const getVersion = () => version;

/** Re-renders the component when the language changes or new translations arrive. */
export function useTx() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return tx;
}
