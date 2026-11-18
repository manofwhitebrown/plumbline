// Static layout check. Reads every piece of CSS in the project and fails on
// things that break layouts on phones. It does not replace looking at real screens.
// CSS sources: src/**/*.css, the <style> block in index.html, and CSS strings inside JS files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---------- collect CSS ----------
const files = walk(join(ROOT, 'src'));
const sources = []; // { file, css }
for (const f of files) {
  if (f.endsWith('.css')) sources.push({ file: relative(ROOT, f), css: readFileSync(f, 'utf8') });
}
const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
for (const m of indexHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) sources.push({ file: 'index.html', css: m[1] });
// CSS written inside JS as a template string: const CSS = `...`
for (const f of files) {
  if (!f.endsWith('.js')) continue;
  const js = readFileSync(f, 'utf8');
  for (const m of js.matchAll(/const\s+CSS\s*=\s*`([\s\S]*?)`/g)) sources.push({ file: relative(ROOT, f), css: m[1] });
}

// ---------- tiny CSS parser ----------
// Returns rules: { file, selector, decls: [[prop, value]], media: [string] }
function parse(css, file) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = []; // at-rule contexts
  let i = 0;
  let buf = '';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      if (head.startsWith('@')) {
        stack.push({ at: head, skip: /^@(-\w+-)?keyframes|^@font-face/.test(head) });
        i++;
        continue;
      }
      // read declarations until matching }
      let depth = 1; let j = i + 1; let body = '';
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        if (text[j] === '}') { depth--; if (depth === 0) break; }
        body += text[j]; j++;
      }
      const skipped = stack.some((s) => s.skip);
      if (!skipped) {
        const decls = [];
        let paren = 0; let cur = '';
        for (const c of body) {
          if (c === '(') paren++;
          if (c === ')') paren--;
          if (c === ';' && paren === 0) { pushDecl(decls, cur); cur = ''; } else cur += c;
        }
        pushDecl(decls, cur);
        for (const sel of head.split(',')) {
          rules.push({ file, selector: sel.trim(), decls, media: stack.filter((s) => s.at.startsWith('@media')).map((s) => s.at) });
        }
      }
      i = j + 1;
      continue;
    }
    if (ch === '}') { stack.pop(); buf = ''; i++; continue; }
    buf += ch; i++;
  }
  return rules;
}
function pushDecl(list, raw) {
  const k = raw.indexOf(':');
  if (k < 0) return;
  const prop = raw.slice(0, k).trim().toLowerCase();
  const value = raw.slice(k + 1).replace(/!important/i, '').trim();
  if (prop) list.push([prop, value]);
}

// Load order matters: src/ui/index.js imports the fixes folder last, so fixes win ties.
const isFix = (f) => f.includes('styles/fixes/');
sources.sort((a, b) => Number(isFix(a.file)) - Number(isFix(b.file)));
const RULES = sources.flatMap((s) => parse(s.css, s.file));
// What the browser really uses: for the same selector and the same media query, the last property line wins.
function winner(selector, media, prop) {
  let v = null;
  for (const r of RULES) {
    if (r.selector === selector && r.media.join('|') === media.join('|') && has(r, prop)) v = get(r, prop);
  }
  return v;
}

// ---------- design tokens (for var(--x) lookups) ----------
const TOKENS = {};
for (const r of RULES) {
  if (r.selector === ':root') for (const [p, v] of r.decls) if (p.startsWith('--')) TOKENS[p] = v;
}
function resolve(value, depth = 0) {
  if (depth > 5) return value;
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, name, fb) => {
    const t = TOKENS[name] ?? fb ?? '';
    return resolve(t, depth + 1);
  });
}
function px(value) {
  let v = resolve(value).trim();
  // max(44px, min-content): the 44px part is the guaranteed minimum
  const mx = /^max\((.*)\)$/.exec(v);
  if (mx) {
    const nums = mx[1].split(',').map((a) => /^\s*(-?\d*\.?\d+)px\s*$/.exec(a)).filter(Boolean).map((m) => parseFloat(m[1]));
    return nums.length ? Math.max(...nums) : null;
  }
  const m = /^(-?\d*\.?\d+)px$/.exec(v);
  return m ? parseFloat(m[1]) : null;
}
function get(rule, prop) {
  const all = rule.decls.filter(([p]) => p === prop);
  return all.length ? all[all.length - 1][1] : null;
}
function has(rule, prop) { return rule.decls.some(([p]) => p === prop); }
const where = (r) => `${r.file}: ${r.selector}`;

// Is this rule only for small screens? (no min-width media query of 481px or more)
function isMobileRule(r) {
  return !r.media.some((m) => {
    const x = /min-width:\s*(\d+)px/.exec(m);
    return x && parseInt(x[1], 10) > 480;
  });
}

test('the CSS parser found the project CSS', () => {
  assert.ok(RULES.length > 100, 'expected many rules, got ' + RULES.length);
  assert.ok(TOKENS['--tap-min'], 'tokens.css should define --tap-min');
});

// 1. 100vh for full height layouts (use 100dvh with a fallback)
test('no 100vh full-height layout without a 100dvh line next to it', () => {
  const bad = [];
  for (const r of RULES) {
    for (const prop of ['height', 'min-height', 'max-height']) {
      const lines = r.decls.filter(([p]) => p === prop).map(([, v]) => v);
      const usesVh = lines.some((v) => /(^|[^d s l])vh\b/.test(v.replace(/(\d)vh/g, '$1 vh')) && /\b(9\d|100)vh/.test(v) && !/dvh|svh|lvh/.test(v));
      const hasDvh = lines.some((v) => /\b\d+dvh/.test(v));
      if (usesVh && !hasDvh) bad.push(`${where(r)} { ${prop} uses vh without a dvh line }`);
    }
  }
  assert.deepEqual(bad, []);
});

// 2. fixed pixel widths above 360 in mobile rules
test('no fixed pixel width above 360px in rules that apply on phones', () => {
  const bad = [];
  for (const r of RULES) {
    if (!isMobileRule(r)) continue;
    for (const prop of ['width', 'min-width']) {
      const v = get(r, prop);
      if (v == null) continue;
      const n = px(v);
      if (n != null && n > 360) bad.push(`${where(r)} { ${prop}: ${v} }`);
    }
  }
  assert.deepEqual(bad, []);
});

// 3. position fixed bars need safe-area padding
// Exempt on purpose: things that cannot be covered by a notch because they hold no content or no taps.
const FIXED_EXEMPT = {
  '.backdrop': 'decorative full-screen fill, no text, no taps (the game column sits on top)',
  '.drag-ghost': 'a small icon that follows the finger, pointer-events none',
  '.tut-layer': 'full-screen holder, pointer-events none; the tip is placed inside the viewport by code',
  '.tut-ring': 'glow ring around a target, pointer-events none',
  '.tut-tip': 'placed by placeTip() inside the viewport, not pinned to an edge',
  '#app': 'full-screen host in index.html; safe areas are applied inside it by .app (top) and .tabbar (bottom)',
  '#splash': 'full-screen loading splash with centered text only, no edge bars and no taps',
};
test('position fixed bars use safe-area padding', () => {
  const bad = [];
  for (const r of RULES) {
    if (get(r, 'position') !== 'fixed') continue;
    if (FIXED_EXEMPT[r.selector]) continue;
    if (/pointer-events:\s*none/.test(r.decls.map(([p, v]) => `${p}: ${v}`).join(';'))) continue;
    const text = r.decls.map(([p, v]) => `${p}:${v}`).join(';');
    if (!/safe-area-inset|--sat|--sab/.test(text)) bad.push(`${where(r)} is position: fixed without safe-area padding`);
  }
  assert.deepEqual(bad, []);
});

test('the fixed exemptions still exist (remove stale ones)', () => {
  const names = new Set(RULES.filter((r) => get(r, 'position') === 'fixed').map((r) => r.selector));
  for (const k of Object.keys(FIXED_EXEMPT)) assert.ok(names.has(k), `exemption ${k} no longer matches a fixed rule`);
});

// 4. tap targets: min-height and min-width 44px
function lastCompound(sel) {
  const parts = sel.split(/[\s>+~]+/).filter(Boolean);
  return parts[parts.length - 1] || '';
}
function classesOf(compound) {
  return [...compound.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
}
function tagOf(compound) {
  const m = /^([a-z][a-z0-9]*)/.exec(compound);
  return m ? m[1] : null;
}
// Things we treat as tap targets: anything with cursor:pointer (each class combination), plus the button classes by name.
// A tap target is a set of classes, for example ".pill.combo" or ".chip". "button" means the plain button tag.
const tapKeys = new Map(); // key -> array of class names ([] with tag 'button' for plain buttons)
function addTap(c) {
  const classes = classesOf(c);
  const key = classes.length ? classes.map((k) => '.' + k).sort().join('') : tagOf(c) === 'button' ? 'button' : null;
  if (key) tapKeys.set(key, classes);
}
for (const r of RULES) if (get(r, 'cursor') === 'pointer') addTap(lastCompound(r.selector));
tapKeys.set('.btn', ['btn']); tapKeys.set('.iconbtn', ['iconbtn']);
// Classes that are always used together with another sized class (checked in the next test).
const COMPANION = { '.iconbtn': '.btn' };

// The size a tap target really gets: every rule whose last compound is made only of its classes adds to it.
// Rules without a media query give the base size (the biggest value wins, a more specific rule may grow it).
// Rules inside a media query must not shrink it below 44.
function sizeFor(key) {
  const classes = tapKeys.get(key) || [];
  const base = { h: null, w: null }; const shrunk = [];
  let fills = false;
  for (const r of RULES) {
    const c = lastCompound(r.selector);
    const rc = classesOf(c);
    const matches = key === 'button'
      ? tagOf(c) === 'button' && rc.length === 0
      : rc.length > 0 && rc.every((k) => classes.includes(k)) && (!tagOf(c) || tagOf(c) === 'button');
    if (!matches) continue;
    const flex = get(r, 'flex') || '';
    if (/^\s*[1-9]/.test(flex) || has(r, 'flex-grow') || get(r, 'width') === '100%') fills = true;
    for (const [prop, slot] of [['min-height', 'h'], ['height', 'h'], ['min-width', 'w'], ['width', 'w']]) {
      const v = get(r, prop); const n = v == null ? null : px(v);
      if (n == null) continue;
      if (r.media.length) shrunk.push({ slot, n, r });
      else base[slot] = base[slot] == null ? n : Math.max(base[slot], n);
    }
  }
  return { minH: base.h, minW: base.w, fills, shrunk };
}
test('every tap target sets min-height and min-width of at least 44px', () => {
  const bad = [];
  for (const key of tapKeys.keys()) {
    const own = sizeFor(key);
    let { minH, minW } = own;
    const { fills, shrunk } = own;
    const comp = COMPANION[key] && sizeFor(COMPANION[key]);
    if (comp) {
      if (minH == null || minH < 44) minH = comp.minH;
      if (minW == null || minW < 44) minW = comp.minW;
    }
    if (minH == null || minH < 44) bad.push(`${key}: min-height is ${minH == null ? 'missing' : minH + 'px'} (need 44px)`);
    // a tab button that fills its row is fine without min-width
    if ((minW == null || minW < 44) && !fills) bad.push(`${key}: min-width is ${minW == null ? 'missing' : minW + 'px'} (need 44px or a flexible width)`);
    for (const s of shrunk) if (s.n < 44) bad.push(`${key}: ${s.r.media.join(' ')} makes it ${s.n}px (${s.r.file}: ${s.r.selector})`);
  }
  assert.deepEqual(bad, []);
});

test('companion classes are always written together with their sized class', () => {
  const bad = [];
  for (const f of files.filter((p) => p.endsWith('.js'))) {
    const js = readFileSync(f, 'utf8');
    for (const [key, companion] of Object.entries(COMPANION)) {
      const k = key.slice(1); const c = companion.slice(1);
      for (const m of js.matchAll(/class(?:Name)?\s*[:=]\s*['"`]([^'"`]*)['"`]/g)) {
        const list = m[1].split(/\s+/);
        if (list.includes(k) && !list.includes(c)) bad.push(`${relative(ROOT, f)}: class "${m[1]}" has ${k} without ${c}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

// 5. text smaller than 12px
test('no font size below 12px', () => {
  const bad = [];
  for (const r of RULES) {
    const v = get(r, 'font-size');
    if (v != null) {
      const rv = resolve(v).trim();
      let n = null;
      if (/px$/.test(rv)) n = parseFloat(rv);
      else if (/rem$|em$/.test(rv)) n = parseFloat(rv) * 16;
      else if (/%$/.test(rv)) n = (parseFloat(rv) / 100) * 16;
      if (n != null && n < 12) bad.push(`${where(r)} { font-size: ${v} }`);
    }
    const shorthand = get(r, 'font');
    if (shorthand) {
      const m = /(?:^|\s)(\d*\.?\d+)px(?:\/|\s|$)/.exec(resolve(shorthand));
      if (m && parseFloat(m[1]) < 12) bad.push(`${where(r)} { font: ${shorthand} }`);
    }
  }
  assert.deepEqual(bad, []);
});

test('type scale tokens never go below 12px', () => {
  for (const [name, v] of Object.entries(TOKENS)) {
    if (!/^--fs-/.test(name)) continue;
    const n = px(v);
    assert.ok(n == null || n >= 12, `${name} is ${v}`);
  }
});

// 6. wide content needs its own sideways scroll
test('tables, code and long rows have overflow-x handling', () => {
  const bad = [];
  for (const r of RULES) {
    const c = lastCompound(r.selector);
    const wide = /^(table|pre|code)\b/.test(c) || /\.(table|code|log|wide)\b/.test(c);
    if (!wide) continue;
    const ox = get(r, 'overflow-x') || get(r, 'overflow') || '';
    if (!/auto|scroll|hidden|clip/.test(ox)) bad.push(`${where(r)} has no overflow-x`);
  }
  assert.deepEqual(bad, []);
});
test('rows that scroll sideways say so (overflow-x with a visible edge)', () => {
  // .chips and .tray are meant to scroll sideways. They must not be clipped by accident.
  for (const sel of ['.chips', '.tray']) {
    const r = RULES.find((x) => x.selector === sel);
    assert.ok(r, sel + ' rule missing');
    assert.match(get(r, 'overflow-x') || '', /auto|scroll/, sel + ' needs overflow-x: auto');
  }
});

// 7. white-space: nowrap needs an ellipsis
test('white-space: nowrap always comes with an ellipsis (or is visually hidden)', () => {
  const bad = [];
  for (const r of RULES) {
    const ws = get(r, 'white-space');
    if (!ws || !/nowrap/.test(ws)) continue;
    const ellipsis = /ellipsis/.test(get(r, 'text-overflow') || '') && /hidden|clip/.test(get(r, 'overflow') || get(r, 'overflow-x') || '');
    const hiddenText = /rect\(0/.test(get(r, 'clip') || '') || /inset\(50%\)/.test(get(r, 'clip-path') || '');
    if (!ellipsis && !hiddenText) bad.push(`${where(r)} has nowrap without text-overflow: ellipsis`);
  }
  assert.deepEqual(bad, []);
});

// 8. extra: the Rig grid must fit a 320px wide phone with 5 columns, and its cells must be 8px apart
test('rig grid with 5 columns fits a 320px wide phone', () => {
  const screenPad = 16 * 2; // .screen padding: var(--space-4) on each side
  const avail = 320 - screenPad;
  const contexts = new Map(); // media key -> media list
  for (const r of RULES) if (r.selector === '.rig-grid') contexts.set(r.media.join('|'), r.media);
  assert.ok(contexts.size > 0);
  for (const media of contexts.values()) {
    // a media rule inherits the base rule for anything it does not set
    const pick = (prop) => winner('.rig-grid', media, prop) ?? winner('.rig-grid', [], prop);
    const cols = pick('grid-template-columns') || '';
    const m = /repeat\([^,]+,\s*(?:minmax\((\d+)px\s*,\s*\d+px\)|(\d+)px)\)/.exec(cols);
    assert.ok(m, 'cannot read grid-template-columns: ' + cols);
    const col = parseInt(m[1] || m[2], 10);
    const gap = px(pick('gap') || '0px') ?? 0;
    const pad = px(pick('padding') || '0px') ?? 0;
    const need = 5 * col + 4 * gap + 2 * pad + 2; // +2 for the border
    assert.ok(need <= avail, `rig grid (${media.join(' ') || 'always'}) needs ${need}px for 5 columns, only ${avail}px free at 320px`);
    assert.ok(gap >= 8, `rig grid (${media.join(' ') || 'always'}) has ${gap}px between cells (need 8px)`);
  }
});

// 9. extra: space between neighbouring tap targets (8px)
const TAP_ROWS = ['.chips', '.tray', '.loadouts', '.actionbar', '.combos', '.power .combos'];
test('rows of tap targets keep 8px between them', () => {
  const bad = [];
  for (const sel of TAP_ROWS) {
    const contexts = new Map();
    for (const r of RULES) if (r.selector === sel) contexts.set(r.media.join('|'), r.media);
    for (const media of contexts.values()) {
      const g = winner(sel, media, 'gap');
      if (g == null) continue; // not set here, so it comes from another rule
      const n = px(g);
      if (n != null && n < 8) bad.push(`${sel} ${media.join(' ')} gap is ${g}`);
    }
    // the final value (after all fixes) must be at least 8
    const last = winner(sel, [], 'gap');
    if (sel === '.power .combos') {
      assert.ok(last != null && px(last) >= 8, `${sel} needs a gap of at least 8px, has ${last}`);
    }
  }
  assert.deepEqual(bad, []);
});
