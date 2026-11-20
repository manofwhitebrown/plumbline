import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADE, gradeAlphas, createGrade } from '../src/render/polish/grade.js';
import { createPolish } from '../src/render/polish/index.js';
import { BIOME_IDS } from '../src/render/palette.js';

function fakeCtx(log = []) {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) { if (String(k).startsWith('create')) return () => grad; return (...a) => { log.push(String(k)); }; },
    set(t, k, v) { log.push('set:' + String(k) + '=' + String(v)); return true; },
  });
}
test('every biome has a grade, and the strength is small enough not to change item colours', () => {
  for (const id of BIOME_IDS) { assert.ok(GRADE[id], id); assert.ok(GRADE[id].a > 0 && GRADE[id].a <= 0.2, id); }
});
test('grade alphas: full strength mid-biome, cross-fade near an edge, never above the biome strength', () => {
  const mid = gradeAlphas('clay', 10);
  assert.equal(mid.next, 0); assert.ok(Math.abs(mid.cur - GRADE.clay.a) < 1e-9);
  const edge = gradeAlphas('clay', 99.9); // 0.1 m before quartz
  assert.equal(edge.to, 'quartz'); assert.ok(edge.next > 0 && edge.cur < GRADE.clay.a);
  assert.ok(edge.cur + edge.next <= Math.max(GRADE.clay.a, GRADE.quartz.a) + 1e-9);
  for (const d of [Number.NaN, -5, 1e9, Infinity]) assert.doesNotThrow(() => gradeAlphas('abyss', d));
  assert.doesNotThrow(() => gradeAlphas('not-a-biome', 5));
});
test('grade draws with soft-light and restores the context', () => {
  const log = []; createGrade().draw(fakeCtx(log), { biomeId: 'magma', depth: 500 }, 360, 640);
  assert.ok(log.includes('set:globalCompositeOperation=soft-light')); assert.ok(log.includes('fillRect'));
  assert.equal(log.filter((l) => l.startsWith('set:globalCompositeOperation')).pop(), 'set:globalCompositeOperation=source-over');
  assert.equal(log.filter((l) => l.startsWith('set:globalAlpha')).pop(), 'set:globalAlpha=1');
});
test('polish draws the grade on high quality only', () => {
  const run = (quality) => { const log = []; const p = createPolish({ quality, makeCanvas: () => null }); p.resize(360, 640, 1); p.drawBack(fakeCtx(log), { biomeId: 'amber', depth: 300, time: 0 }); return log.join(','); };
  assert.ok(run('high').includes('soft-light'));
  assert.ok(!run('low').includes('soft-light'));
});
