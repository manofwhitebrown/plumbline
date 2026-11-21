import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HELP } from '../src/data/help.js';

const md = readFileSync(new URL('../docs/PLAY.md', import.meta.url), 'utf8');

test('PLAY.md is one page of plain words', () => {
  assert.ok(md.split(/\s+/).length < 600, 'too long for one page');
  assert.ok(!/\b(debug|fixture|payload|slice|seed|lane|hazard|tier|build abc|Actions tab)\b/i.test(md));
});

test('PLAY.md names every term a new player meets', () => {
  for (const id of ['crew', 'manager', 'workshop', 'part', 'combo', 'loadout', 'suggest', 'strain', 'haulUp', 'snap', 'shards', 'coreDust',
    'collapse', 'codex', 'goals', 'boon', 'brace', 'surge', 'flare', 'guardian', 'relic', 'daily']) {
    const title = HELP[id].title.replace(/s$/, '');
    assert.ok(md.toLowerCase().includes(title.toLowerCase()), 'PLAY.md does not mention ' + HELP[id].title);
  }
  assert.ok(md.includes('30%') && md.includes('10%'));
});
