// LAYOUT-2: static guards for the Rig bar, the filter chip rows and the Results stack.
// These read the CSS and the Rig source as text. The real-browser pictures are in docs/notes/LAYOUT-2.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = (f) => readFileSync(new URL('../src/ui/styles/' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (text, selector) => {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) if (m[1].split(',').some((s) => s.trim() === selector)) out.push(m[2]);
  return out.join(' ');
};

test('Rig: the Suggest / Clear / Drop bar is its own row, not a sticky overlay', () => {
  const bar = rule(css('screens.css'), '.actionbar');
  assert.ok(bar.length > 0, '.actionbar rule exists');
  assert.ok(!/position:\s*sticky|position:\s*fixed|position:\s*absolute/.test(bar), 'the bar must not float over the content');
  assert.match(bar, /flex:\s*0 0 auto/);
});

test('Rig: the content scrolls in .rig-scroll and the screen itself does not scroll', () => {
  const scr = rule(css('screens.css'), '.screen.screen-rig');
  assert.match(scr, /overflow:\s*hidden/);
  const sc = rule(css('screens.css'), '.screen.screen-rig > .rig-scroll');
  assert.match(sc, /overflow-y:\s*auto/);
  assert.match(sc, /min-height:\s*0/);
  const src = readFileSync(new URL('../src/ui/screens/rig.js', import.meta.url), 'utf8');
  const i = src.indexOf("class: 'rig-scroll'");
  const j = src.indexOf("class: 'actionbar'");
  assert.ok(i > 0 && j > i, 'the action bar is built after (outside) the scrolling part');
  assert.ok(src.indexOf('rig-helps') > i && src.indexOf('rig-helps') < j, 'the help buttons are inside the scrolling part');
});
