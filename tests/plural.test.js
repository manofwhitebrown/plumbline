// HUD-2: singular and plural wording. One helper, plus a scan so nobody hard-codes "1 Shards" again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { plural, countText } from '../src/core/plural.js';

test('plural: one is singular, everything else is plural', () => {
  assert.equal(plural(1, 'Shard'), 'Shard');
  assert.equal(plural(0, 'Shard'), 'Shards');
  assert.equal(plural(2, 'Shard'), 'Shards');
  assert.equal(plural('1', 'gem'), 'gem');
  assert.equal(plural(2, 'Berry', 'Berries'), 'Berries');
  assert.equal(plural(1, 'Berry', 'Berries'), 'Berry');
  assert.equal(plural(NaN, 'relic'), 'relics');
  assert.equal(plural(undefined, 'combo'), 'combos');
});

test('countText: number and word together, using the shared number format', () => {
  assert.equal(countText(1, 'Shard'), '1 Shard');
  assert.equal(countText(3, 'Shard'), '3 Shards');
  assert.equal(countText(0, 'gem'), '0 gems');
  assert.equal(countText(1500, 'gem'), '1.5K gems');
  assert.equal(countText(1, 'relic'), '1 relic');
  assert.equal(countText(NaN, 'combo'), '0 combos');
});

// Scan: a number (a call, a variable or a ${...}) glued to a hard-coded plural word.
const COUNT_WORDS = '(Shards|shards|gems|Gems|relics|Relics|combos|Combos|hits|pieces|Pieces)';
const GLUED = [
  new RegExp('[)}\\w]\\s*\\+\\s*[\'"`]\\s*' + COUNT_WORDS + '\\b'),   // fmt(n) + ' Shards'
  new RegExp('\\$\\{[^}]+\\}\\s+' + COUNT_WORDS + '\\b'),              // `${n} gems`
];
function walk(dir, out) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

test('no screen, meta, data or cheat file glues a number to a hard-coded plural word', () => {
  const files = ['src/ui', 'src/meta', 'src/data', 'src/cheats'].flatMap((d) => walk(d, []));
  const bad = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (line.trim().startsWith('//')) return;
      if (GLUED.some((re) => re.test(line))) bad.push(f + ':' + (i + 1) + ': ' + line.trim().slice(0, 110));
    });
  }
  assert.deepEqual(bad, [], 'use plural() or countText() from src/core/plural.js:\n' + bad.join('\n'));
});

test('real texts: one Shard, many Shards; one hit, many hits; one gem goal', async () => {
  const { rewardLabel } = await import('../src/meta/contracts.js');
  assert.equal(rewardLabel({ reward: { shards: 1 } }), '1 Shard');
  assert.equal(rewardLabel({ reward: { shards: 4 } }), '4 Shards');
  const { TEMPLATES } = await import('../src/data/goals.js');
  const texts = new Set();
  for (const t of TEMPLATES) for (const lv of [0, 1, 2]) for (const best of [0, 50, 400, 3000]) texts.add(t.make(best, lv).text);
  for (const t of texts) assert.doesNotMatch(t, /\b1 (gems|hits)\b/, t);
});
