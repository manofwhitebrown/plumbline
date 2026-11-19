// No emoji in player text (UIART-1). Icons come from icons.js. Plain typographic marks (x, arrows in "Now -> Next", the middle dot) are fine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/u;
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) { const p = dir + '/' + f; if (statSync(p).isDirectory()) walk(p, out); else if (/\.(js|css|html)$/.test(p)) out.push(p); }
  return out;
}
test('no emoji or symbol-font glyphs anywhere in src, index.html or public text', () => {
  const root = new URL('..', import.meta.url).pathname;
  const files = [...walk(root + 'src'), root + 'index.html'];
  const hits = [];
  for (const f of files) readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (EMOJI.test(line)) hits.push(f.replace(root, '') + ':' + (i + 1) + '  ' + line.trim().slice(0, 80)); });
  assert.deepEqual(hits, []);
});
