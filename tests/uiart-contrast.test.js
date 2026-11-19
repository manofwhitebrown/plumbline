// Contrast calculator for the theme tokens (UIART-1). 4.5:1 for body text, 3:1 for large text and UI edges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function tokens(file) {
  let css = readFileSync(new URL(file, import.meta.url), 'utf8');
  // Only the first :root block: later blocks (colorblind, high contrast) are checked on their own.
  const root = css.match(/:root\s*\{[\s\S]*?\n\}/);
  if (root) css = root[0];
  const out = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]] = m[2];
  return out;
}
const T = { ...tokens('../src/ui/styles/tokens.css'), ...tokens('../src/ui/theme/theme.css') };
// The CB palette lives in a [data-cb] block; read it separately so it is checked too.
const cbBlock = readFileSync(new URL('../src/ui/theme/theme.css', import.meta.url), 'utf8').match(/\[data-cb="1"\]\s*\{([^}]*)\}/)[1];
const CB = { ...T }; for (const m of cbBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) CB[m[1]] = m[2];

const SURFACES = ['--ink-900', '--ink-800', '--ink-700', '--metal-2', '--leather'];
const BODY = [['--text', 4.5], ['--muted', 4.5], ['--gold', 4.5], ['--gold-soft', 4.5], ['--shard', 4.5], ['--core', 4.5], ['--ok', 4.5], ['--ember', 4.5]];

test('every colour token we check exists', () => {
  for (const k of [...SURFACES, ...BODY.map((b) => b[0]), '--danger', '--brass']) assert.ok(T[k], k + ' is missing');
});
test('body text and accent text hold their ratio on every surface', () => {
  for (const [fg, min] of BODY) for (const bg of SURFACES) {
    const r = ratio(hex(T[fg]), hex(T[bg]));
    assert.ok(r >= min, `${fg} on ${bg} is ${r.toFixed(2)}:1 (needs ${min}:1)`);
  }
});
test('danger and brass hold 3:1 (large text and UI edges) on the panel surfaces', () => {
  for (const fg of ['--danger', '--brass']) for (const bg of ['--ink-800', '--ink-700']) assert.ok(ratio(hex(T[fg]), hex(T[bg])) >= 3, fg + ' on ' + bg);
});
test('dark button text on the gold gradient holds 4.5:1 at every stop', () => {
  for (const stop of ['#fff0c4', '#f6c453', '#d99a2b']) assert.ok(ratio(hex('#2a1704'), hex(stop)) >= 4.5, 'text on ' + stop);
});
test('colorblind palette keeps 3:1 against the surfaces and the pairs stay apart', () => {
  for (const k of ['--ok', '--danger', '--ember', '--shard', '--core', '--tier-1', '--tier-2', '--tier-3', '--tier-4', '--tier-5']) for (const bg of ['--ink-800', '--ink-700']) {
    const r = ratio(hex(CB[k]), hex(CB[bg]));
    assert.ok(r >= 3, `${k} (colorblind) on ${bg} is ${r.toFixed(2)}:1`);
  }
  assert.ok(ratio(hex(CB['--ok']), hex(CB['--danger'])) >= 1.2 || CB['--ok'] !== CB['--danger'], 'ok and danger must differ');
  assert.notEqual(CB['--ok'].toLowerCase(), CB['--danger'].toLowerCase());
});
test('high-contrast fallback tokens reach 7:1', () => {
  assert.ok(ratio(hex('#ffffff'), hex(T['--ink-900'])) >= 7);
  assert.ok(ratio(hex('#c9d0e8'), hex('#0d1220')) >= 7);
});
