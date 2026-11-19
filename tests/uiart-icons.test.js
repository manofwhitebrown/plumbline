// Icon registry completeness (UIART-1): every id used in the source exists, and the set is the size we promised.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { ICONS, ICON_IDS, iconHtml, hasIcon, iconAliases } from '../src/ui/icons.js';

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) { const p = dir + '/' + f; if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); }
  return out;
}
const FILES = walk(new URL('../src', import.meta.url).pathname).filter((f) => !f.includes('/src/ui/icons'));

test('about 60 unique icons, all valid inline SVG', () => {
  const unique = ICON_IDS.filter((k) => !(k in iconAliases));
  assert.ok(unique.length >= 60, 'only ' + unique.length + ' icons');
  for (const id of ICON_IDS) {
    const s = ICONS[id];
    assert.ok(typeof s === 'string' && s.startsWith('<svg ') && s.endsWith('</svg>'), id + ' is not an svg string');
    assert.ok(/viewBox="0 0 (24|64) (24|64)"/.test(s), id + ' has no viewBox');
    assert.ok(!/<script|on\w+=|javascript:/i.test(s), id + ' has unsafe markup');
    const opens = (s.match(/<(?!\/|svg\b)[a-z]+/g) || []).length, selfs = (s.match(/\/>/g) || []).length, closes = (s.match(/<\/(?!svg)[a-z]+>/g) || []).length;
    assert.equal(opens, selfs + closes, id + ' has unbalanced tags');
  }
});
test('the old API still works (ids and fallback)', () => {
  for (const id of ['gold', 'shard', 'core', 'settings', 'home', 'rig', 'crew', 'workshop', 'codex', 'more', 'pause', 'back', 'close', 'gift', 'star', 'lock', 'book', 'check', 'bolt']) assert.ok(hasIcon(id), id);
  assert.equal(iconHtml('definitely-not-an-icon'), ICONS.star);
});
test('everything the brief names has an icon', () => {
  for (const id of ['gold', 'shard', 'core', 'depth', 'drop', 'haul', 'rope', 'hook', 'bucket', 'rig', 'workshop', 'crew', 'codex', 'rewards', 'settings', 'sound', 'music', 'haptics', 'motion', 'textsize', 'eye', 'save', 'export', 'import', 'lock', 'check', 'close', 'back', 'plus', 'minus', 'info', 'warning', 'fire', 'snowflake', 'bolt', 'shield', 'magnet',
    'badge-collector', 'badge-processor', 'badge-defense', 'badge-engine', 'badge-special', 'illo-empty', 'illo-locked', 'illo-error']) assert.ok(hasIcon(id), 'missing ' + id);
});
test('every icon id used in the source exists in the registry', () => {
  const used = new Map();
  const add = (id, file) => { if (id && !used.has(id)) used.set(id, file); };
  for (const f of FILES) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/iconHtml\(\s*['"`]([\w-]+)['"`]\s*\)/g)) add(m[1], f);
    for (const m of src.matchAll(/\bicon\s*:\s*['"`]([\w-]+)['"`]/g)) add(m[1], f);
    for (const m of src.matchAll(/\bcurrency\s*[:=][^;\n]*icon\s*:\s*['"`]([\w-]+)['"`]/g)) add(m[1], f);
  }
  assert.ok(used.size > 5, 'scan found too few ids, the test is broken');
  const missing = [...used].filter(([id]) => !hasIcon(id)).map(([id, f]) => id + ' (' + f.split('/src/')[1] + ')');
  assert.deepEqual(missing, []);
});
