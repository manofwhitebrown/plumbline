import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HELP, HELP_IDS, HELP_MAX, helpText, helpTitle } from '../src/data/help.js';
import { placeHelp } from '../src/ui/components/helpTip.js';

const REQUIRED = ['crew', 'manager', 'milestone', 'workshop', 'part', 'combo', 'loadout', 'suggest', 'strain', 'haulUp', 'snap',
  'shards', 'coreDust', 'collapse', 'codex', 'goals', 'boon', 'brace', 'surge', 'flare', 'guardian', 'relic', 'daily'];
const NEVER = /\b(beat|lane|tick|entity|null|undefined|NaN|Infinity|seed|slice|bus|payload|debug|hazard|tier)\b/i;

test('every term a new player meets has help text', () => {
  for (const id of REQUIRED) assert.ok(HELP[id], 'missing help for ' + id);
});

test('help text fits: 90 characters, plain words, ends with a full stop', () => {
  for (const id of HELP_IDS) {
    const { title, text } = HELP[id];
    assert.ok(text.length > 10 && text.length <= HELP_MAX, id + ' length ' + text.length);
    assert.ok(title.length > 0 && title.length <= 22, id + ' title');
    assert.ok(!NEVER.test(text) && !NEVER.test(title), id + ' uses a developer word');
    assert.ok(/[.!?]$/.test(text), id + ' should end with a full stop');
  }
});

test('bad ids never crash', () => {
  for (const bad of [undefined, null, 5, {}, 'nope', '']) {
    assert.equal(typeof helpText(bad), 'string');
    assert.equal(typeof helpTitle(bad), 'string');
  }
});

test('docs/onboard/TERMS.md lists every help line word for word', () => {
  const md = readFileSync(new URL('../docs/onboard/TERMS.md', import.meta.url), 'utf8');
  for (const id of HELP_IDS) {
    assert.ok(md.includes('| ' + HELP[id].title + ' | ' + HELP[id].text + ' |'), 'TERMS.md out of date for ' + id);
  }
});

test('Crew and Collapse help agree with the real numbers', () => {
  assert.match(HELP.collapse.text, /fresh start/i);
  assert.match(HELP.coreDust.text, /10%/);
  assert.match(HELP.snap.text, /30%/);
});

test('the help note always stays on screen (many sizes and spots)', () => {
  let s = 4242;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const sizes = [[320, 568], [360, 640], [375, 667], [390, 844], [430, 932], [768, 1024], [1440, 900], [844, 390]];
  for (const [w, h] of sizes) {
    for (let i = 0; i < 300; i++) {
      const anchor = { left: rnd() * w * 1.1 - 20, top: rnd() * h * 1.1 - 20, width: 44, height: 44 };
      const size = { w: 100 + rnd() * 300, h: 40 + rnd() * 160 };
      const p = placeHelp(anchor, size, { w, h });
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.w) && Number.isFinite(p.h));
      assert.ok(p.x >= 12 - 0.001 && p.x + p.w <= w - 12 + 0.001, `x ${p.x}+${p.w} in ${w}`);
      assert.ok(p.y >= 12 - 0.001 && p.y + p.h <= h - 12 + 0.001, `y ${p.y}+${p.h} in ${h}`);
    }
  }
  const bad = placeHelp(null, undefined, undefined);
  assert.ok(Number.isFinite(bad.x) && Number.isFinite(bad.y));
});
