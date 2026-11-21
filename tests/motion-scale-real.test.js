// LAYOUT-2 (for ONBOARD-2's request): button and Results animations use REAL scale values.
// With composite "add" a transform list is joined, so scale(-0.03) or scale(0) made buttons about 0 px and taps missed them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const f of ['micro.js', 'results.js']) {
  test('motion/' + f + ': no negative or zero scale in transform frames', () => {
    const src = readFileSync(new URL('../src/ui/motion/' + f, import.meta.url), 'utf8')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/scale\(\s*-/.test(src), 'no scale(-...)');
    assert.ok(!/scale\(\s*0\s*\)/.test(src), 'no scale(0)');
    assert.ok(!/scale\(\s*\(?\s*-\s*0\./.test(src), 'no scale(-0.x * k)');
  });
}
