/**
 * Step 2 of `npm run i18n`: translates the app's English text into every
 * language the app offers and writes src/i18n/generated/<lang>.json.
 *
 * Sources:
 *  - source.json (from i18n-extract.mjs): text written in the screens, patterns
 *    and the server's messages
 *  - the i18next keys of `en` in src/i18n/index.ts
 *  - the admin's lists from the live API (/api/meta): cities, vehicle types,
 *    licence types, plans
 *
 * Only missing entries are translated, so it is safe to run again after adding
 * text. Hand corrections go in generated/overrides.json ({ "hi": { "English":
 * "सही अनुवाद" } }); they always win. Machine translation via
 * google-translate-api-x: fine for a first version, but have a native speaker
 * review each language.
 *
 *   node scripts/i18n-translate.mjs            all languages
 *   node scripts/i18n-translate.mjs hi ta      only these
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import translate from 'google-translate-api-x';

const here = path.dirname(fileURLToPath(import.meta.url));
const I18N = path.join(here, '..', 'src', 'i18n');
const GEN = path.join(I18N, 'generated');
const LANGS = ['hi', 'mr', 'gu', 'bn', 'pa', 'ta', 'te', 'kn'];
const META_URL = process.env.META_URL || 'https://driver-finder-api.onrender.com/api/meta';
const BATCH = 40;
/** Codes that stay as they are in every language (LMV, HMV, GST, OTP...). */
const KEEP = /^[A-Z0-9]{2,5}$/;
const BRAND = 'Driver Finder';
const BRAND_TOKEN = '{99}';

const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokens = (s) => (s.match(/\{\d+\}/g) ?? []).sort().join(',');

/* ------------------------------------------------- English i18next keys */

function englishKeys() {
  const file = path.join(I18N, 'index.ts');
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let obj;
  ts.forEachChild(src, (n) => {
    if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) if (d.name.getText(src) === 'en' && d.initializer && ts.isObjectLiteralExpression(d.initializer)) obj = d.initializer;
  });
  if (!obj) throw new Error('Could not find `const en = {...}` in src/i18n/index.ts');
  const flat = {};
  const walk = (o, prefix) => {
    for (const p of o.properties) {
      if (!ts.isPropertyAssignment(p)) continue;
      const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : p.name.getText(src);
      const key = prefix ? `${prefix}.${name}` : name;
      if (ts.isObjectLiteralExpression(p.initializer)) walk(p.initializer, key);
      else if (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)) flat[key] = p.initializer.text;
    }
  };
  walk(obj, '');
  return flat;
}

/* ------------------------------------------------------- admin's lists */

async function metaTexts() {
  try {
    const m = await (await fetch(META_URL)).json();
    const out = new Set();
    for (const c of m.categories ?? []) {
      out.add(c.label);
      (c.types ?? []).forEach((t) => out.add(t));
    }
    (m.cities ?? []).forEach((c) => out.add(c));
    (m.licenceTypes ?? []).forEach((c) => out.add(c));
    for (const p of m.plans ?? []) {
      [p.name, p.note, p.tag, ...(p.benefits ?? [])].forEach((t) => t && out.add(t));
    }
    if (m.support?.hours) out.add(m.support.hours);
    return [...out].filter((s) => typeof s === 'string' && /[A-Za-z]/.test(s)).map((s) => s.trim());
  } catch (e) {
    console.warn(`Could not read ${META_URL} (${e.message}); the admin's lists will be translated by the server at run time instead.`);
    return [];
  }
}

/* ------------------------------------------------------------ translate */

/** i18next "{{name}}" <-> "{0}" so the translator keeps the placeholders. */
function protect(text) {
  const names = [];
  let s = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n) => {
    names.push(n);
    return `{${50 + names.length - 1}}`;
  });
  s = s.split(BRAND).join(BRAND_TOKEN);
  return { s, restore: (t) => t.split(BRAND_TOKEN).join(BRAND).replace(/\{(\d+)\}/g, (m, i) => (Number(i) >= 50 && names[Number(i) - 50] ? `{{${names[Number(i) - 50]}}}` : m)) };
}

async function call(texts, to, attempt = 0) {
  try {
    const res = await translate(texts, { from: 'en', to, autoCorrect: false, rejectOnPartialFail: false });
    return (Array.isArray(res) ? res : [res]).map((r) => (r && typeof r.text === 'string' ? r.text : null));
  } catch (e) {
    if (attempt >= 4) {
      console.warn(`  gave up on a batch (${to}): ${e.message}`);
      return texts.map(() => null);
    }
    await sleep(2500 * (attempt + 1) ** 2);
    return call(texts, to, attempt + 1);
  }
}

/**
 * Translates `list` into `to`; returns Map(english -> translation) for those
 * that came back intact. `sourceOf` gives the wording actually sent (a clearer
 * phrase from glosses.json for ambiguous labels like "Applied" or "Cover").
 */
async function translateList(list, to, sourceOf, onProgress) {
  const done = new Map();
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    const prepared = chunk.map((t) => protect(sourceOf(t)));
    const out = await call(prepared.map((p) => p.s), to);
    const retry = [];
    chunk.forEach((text, j) => {
      const got = out[j];
      if (got && tokens(got) === tokens(prepared[j].s)) done.set(text, prepared[j].restore(got).trim());
      else retry.push(j);
    });
    // Placeholders lost or nothing came back: try those one by one.
    for (const j of retry) {
      const [got] = await call([prepared[j].s], to);
      if (got && tokens(got) === tokens(prepared[j].s)) done.set(chunk[j], prepared[j].restore(got).trim());
      await sleep(250);
    }
    onProgress(Math.min(i + BATCH, list.length), list.length);
    await sleep(350);
  }
  return done;
}

/* ------------------------------------------------------------------ run */

const only = process.argv.slice(2).filter((a) => LANGS.includes(a));
const sources = readJson(path.join(GEN, 'source.json'), []);
const keys = englishKeys();
const meta = await metaTexts();
const overrides = readJson(path.join(GEN, 'overrides.json'), {});
const glosses = readJson(path.join(GEN, 'glosses.json'), {});
/** Word-sense fixes per language, applied to every translation (e.g. Tamil "driver" as a person, not software). */
const terms = readJson(path.join(GEN, 'terms.json'), {});
const fixTerms = (lang, text) => Object.entries(terms[lang] ?? {}).reduce((s, [from, to]) => s.split(from).join(to), text);
/** The wording each entry was last translated from, so a changed gloss is translated again. */
const usedFile = path.join(GEN, 'sources-used.json');
const used = readJson(usedFile, {});
const sourceOf = (text) => glosses[text] ?? text;
const autoList = [...new Set([...sources, ...meta])].filter((s) => s !== BRAND);
console.log(`${autoList.length} texts (${meta.length} from the admin's lists) + ${Object.keys(keys).length} keys`);

for (const lang of only.length ? only : LANGS) {
  const file = path.join(GEN, `${lang}.json`);
  const prev = readJson(file, { keys: {}, auto: {} });
  // Drop entries whose English text no longer exists, keep the rest.
  const auto = Object.fromEntries(Object.entries(prev.auto ?? {}).filter(([k]) => autoList.includes(k)));
  const keyOut = Object.fromEntries(Object.entries(prev.keys ?? {}).filter(([k]) => keys[k] !== undefined));

  const usedLang = (used[lang] ??= {});
  const stale = (text) => (usedLang[text] ?? text) !== sourceOf(text);
  const fixed = (text) => KEEP.test(text) || overrides[lang]?.[text] !== undefined;
  for (const s of autoList) if (KEEP.test(s)) auto[s] = s;
  for (const k of Object.keys(keys)) if (KEEP.test(keys[k])) keyOut[k] = keys[k];
  // A new key whose English text has a hand correction is never sent for translation: take the correction.
  for (const k of Object.keys(keys)) if (overrides[lang]?.[keys[k]] !== undefined) keyOut[k] = overrides[lang][keys[k]];
  const missingAuto = autoList.filter((s) => !fixed(s) && (!auto[s] || stale(s)));
  const missingKeys = Object.keys(keys).filter((k) => !fixed(keys[k]) && (!keyOut[k] || stale(keys[k])));
  // Keys with the same English text are translated once.
  const keyTexts = [...new Set(missingKeys.map((k) => keys[k]))];

  process.stdout.write(`${lang}: ${missingAuto.length} texts, ${missingKeys.length} keys to translate\n`);
  const save = () => {
    const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
    const fixedAuto = Object.fromEntries(Object.entries(auto).map(([k, v]) => [k, fixTerms(lang, v)]));
    const final = { ...fixedAuto, ...(overrides[lang] ?? {}) };
    final[BRAND] = BRAND;
    // Hand corrections also apply to the i18next keys with the same English text.
    const fixedKeys = Object.fromEntries(Object.entries(keyOut).map(([k, v]) => [k, overrides[lang]?.[keys[k]] ?? fixTerms(lang, v)]));
    fs.writeFileSync(file, JSON.stringify({ keys: sorted(fixedKeys), auto: sorted(final) }, null, 1) + '\n');
  };

  const a = await translateList(missingAuto, lang, sourceOf, (n, t) => {
    if (n % 200 < BATCH || n === t) process.stdout.write(`  ${lang} texts ${n}/${t}\n`);
  });
  a.forEach((v, k) => {
    auto[k] = v;
    usedLang[k] = sourceOf(k);
  });
  save();

  const b = await translateList(keyTexts, lang, sourceOf, () => {});
  for (const k of missingKeys) if (b.has(keys[k])) keyOut[k] = b.get(keys[k]);
  b.forEach((v, k) => (usedLang[k] = sourceOf(k)));
  save();
  // Keep only what differs from the plain English, so the file stays small.
  used[lang] = Object.fromEntries(Object.entries(usedLang).filter(([k, v]) => k !== v));
  fs.writeFileSync(usedFile, JSON.stringify(used, null, 1) + '\n');
  process.stdout.write(`  ${lang} done: ${Object.keys(auto).length}/${autoList.length} texts, ${Object.keys(keyOut).length}/${Object.keys(keys).length} keys\n`);
}
