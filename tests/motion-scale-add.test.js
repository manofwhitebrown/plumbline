// With WAAPI composite "add", transform lists are JOINED, so scale(-0.03) is a real scale of about 0 and flipped.
// Taps then land beside a shrunken button. Every scale() in these files must be a real size (0.5 to 1.5). [FINISH-3]
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const f of ['src/ui/motion/micro.js', 'src/ui/motion/results.js']) {
  test('motion: ' + f + ' has no near-zero or negative scale() in an added animation', () => {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/scale\(\s*(-?[0-9.]+)\s*\)/g)) {
      const v = Number(m[1]);
      assert.ok(v >= 0.5 && v <= 1.5, f + ': scale(' + m[1] + ') is not a real size');
    }
    // computed ones such as scale(' + (1 - 0.08 * k) + ')' must start from 1
    for (const m of src.matchAll(/scale\(' \+ \(([^)]*)\) \+ '\)/g)) assert.match(m[1], /^1 - /, f + ': computed scale must be 1 minus something');
  });
}
