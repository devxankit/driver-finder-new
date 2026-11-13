/**
 * Step 1 of `npm run i18n`: collects every English text the app can show.
 *
 *  - text written in the screens (JSX text, titles, labels, alerts)
 *  - sentences built from parts, as patterns: `${n} drivers near you` and
 *    <T>Step {n} of 3</T> become "{0} drivers near you" and "Step {0} of 3"
 *  - the server's messages (errors, notifications, validation)
 *
 * Writes src/i18n/generated/source.json. Collecting too much is harmless: a
 * text that is never shown is simply never looked up.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(here, '..', 'src');
const BACKEND = path.join(here, '..', '..', 'backend', 'src');
const OUT = path.join(APP, 'i18n', 'generated', 'source.json');

const found = new Set();

/** Attributes whose value is shown to the user even when it is one short word. */
const UI_ATTRS = new Set(['title', 'label', 'placeholder', 'text', 'subtitle', 'sub', 'note', 'action', 'message', 'hint', 'suffix', 'value', 'status', 'error']);
/** Attributes that are never shown. */
const SKIP_ATTRS = new Set(['name', 'key', 'variant', 'tone', 'w', 'resizeMode', 'keyboardType', 'accessibilityRole', 'animation', 'behavior', 'testID', 'returnKeyType', 'autoCapitalize', 'style', 'source', 'presentation']);
const SKIP_CALLS = /^(require|t|api|upload|useQuery|usePagedQuery|navigate|reset|replace|push|getItem|setItem|removeItem|log|warn|error|emit|on|off|addEventListener|test|match|replace|split|join|includes|startsWith|endsWith|indexOf)$/;

const hasLetter = (s) => /[A-Za-z]/.test(s);
const junk = (s) => /^(#|rgba?\(|https?:|\.\.?\/|@|\/[a-z-]+\/)/.test(s) || /^[a-z]+(-[a-z]+)+$/.test(s) || /^NotoSans/.test(s) || /^[\w.-]+\.(png|jpg|json|ttf)$/.test(s);

function add(text) {
  const s = text.trim();
  if (!s || s.length > 400 || !hasLetter(s.replace(/\{\d+\}/g, ''))) return;
  if (/\/api/.test(s)) return; // request paths, not text
  found.add(s);
}

/** A literal that looks like something a person reads. */
function looksUi(s, strict) {
  const v = s.trim();
  if (!v || !hasLetter(v) || junk(v)) return false;
  if (/\s/.test(v)) return strict ? /^["'“(]?[A-Z₹+]/.test(v) : true;
  return /^[A-Z][a-z]+[.!?:…]?$/.test(v) || /^\/[a-z]+$/.test(v);
}

/** Babel/TypeScript's rule for whitespace in JSX text, so keys match what React renders. */
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((line, i) => {
    if (/[^ \t]/.test(line)) lastNonEmpty = i;
  });
  let out = '';
  lines.forEach((line, i) => {
    let s = line.replace(/\t/g, ' ');
    if (i !== 0) s = s.replace(/^ +/, '');
    if (i !== lines.length - 1) s = s.replace(/ +$/, '');
    if (s) {
      if (i !== lastNonEmpty) s += ' ';
      out += s;
    }
  });
  return decode(out);
}

const decode = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const isStr = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);

/** "a" + x + "b" flattened into parts. */
function concatParts(node, parts = []) {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    concatParts(node.left, parts);
    concatParts(node.right, parts);
  } else parts.push(node);
  return parts;
}

function pattern(parts) {
  let n = 0;
  let out = '';
  let fixed = '';
  for (const p of parts) {
    if (typeof p === 'string') {
      out += p;
      fixed += p;
    } else out += `{${n++}}`;
  }
  return n > 0 && (fixed.match(/[A-Za-z]/g) ?? []).length >= 2 ? out : null;
}

function scan(file, { strict }) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS);

  const visit = (node) => {
    // import/export paths
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(src);
      if (SKIP_ATTRS.has(name)) return;
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        const v = node.initializer.text;
        if (UI_ATTRS.has(name) ? hasLetter(v) && !junk(v) : looksUi(v, strict)) add(v);
        return;
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : '';
      if (SKIP_CALLS.test(name) || (ts.isPropertyAccessExpression(callee) && callee.expression.getText(src) === 'console')) {
        // still look inside non-literal arguments (callbacks)
        node.arguments.forEach((a) => !isStr(a) && ts.forEachChild(a, visit));
        return;
      }
    }

    // <T>Step {n} of 3</T>: the whole line as a pattern, plus each fixed piece
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const parts = [];
      let onlyText = true;
      for (const c of node.children) {
        if (ts.isJsxText(c)) {
          const t = jsxText(c.text);
          if (t) {
            parts.push(t);
            add(t);
          }
        } else if (ts.isJsxExpression(c)) {
          if (!c.expression) continue;
          if (isStr(c.expression)) {
            parts.push(c.expression.text);
          } else parts.push(null);
        } else onlyText = false;
      }
      if (onlyText && parts.length > 1) {
        const p = pattern(parts);
        if (p) add(p);
      }
    }

    if (isStr(node)) {
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) return; // object key
      if (ts.isElementAccessExpression(node.parent)) return;
      if (looksUi(node.text, strict)) add(node.text);
      return;
    }

    if (ts.isTemplateExpression(node)) {
      const parts = [node.head.text];
      for (const span of node.templateSpans) {
        parts.push(null);
        parts.push(span.literal.text);
      }
      const p = pattern(parts);
      if (p && !junk(p) && (!strict || /^["'“(]?[A-Z{₹+]/.test(p.trim()))) add(p);
      // the fixed pieces too, for when a part is itself a sentence
      parts.forEach((x) => typeof x === 'string' && looksUi(x, true) && x.trim().length > 3 && add(x));
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && !(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      const parts = concatParts(node).map((p) => (isStr(p) ? p.text : null));
      if (parts.some((p) => typeof p === 'string')) {
        const p = pattern(parts);
        if (p && !junk(p)) add(p);
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(src);
}

function walk(dir, exts, skip = []) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (skip.some((s) => full.includes(s))) continue;
    if (e.isDirectory()) out.push(...walk(full, exts, skip));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

// The app: everything except the hand-written i18next dictionaries.
for (const f of walk(APP, ['.ts', '.tsx'], [path.join('src', 'i18n'), path.join('src', 'assets')])) scan(f, { strict: false });
const fromApp = found.size;

// The server: messages people see (errors, validation, notifications).
for (const dir of ['controllers', 'services', 'validation', 'middleware', 'utils']) {
  for (const f of walk(path.join(BACKEND, dir), ['.js'])) scan(f, { strict: true });
}

const list = [...found].sort((a, b) => a.localeCompare(b));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(list, null, 1) + '\n');
console.log(`${list.length} texts (${fromApp} from the app, ${list.length - fromApp} from the server), ${list.filter((s) => /\{\d+\}/.test(s)).length} patterns -> ${path.relative(process.cwd(), OUT)}`);
