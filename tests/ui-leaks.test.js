// Leak check: a screen scope must give back every listener when it is disposed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createScope } from '../src/ui/dom.js';
import { bus } from '../src/core/bus.js';

function fakeTarget() {
  const map = new Map();
  return {
    addEventListener(t, f) { (map.get(t) || map.set(t, new Set()).get(t)).add(f); },
    removeEventListener(t, f) { if (map.has(t)) map.get(t).delete(f); },
    total() { let n = 0; for (const s of map.values()) n += s.size; return n; },
  };
}

test('scope: 50 mount and unmount rounds leave zero listeners', () => {
  const win = fakeTarget();
  const el = fakeTarget();
  let calls = 0;
  for (let i = 0; i < 50; i++) {
    const scope = createScope();
    scope.on(win, 'keydown', () => {});
    scope.on(el, 'click', () => {});
    scope.sub(bus, 'meta:changed', () => { calls++; });
    scope.sub(bus, 'run:events', () => { calls++; });
    scope.dispose();
  }
  assert.equal(win.total(), 0);
  assert.equal(el.total(), 0);
  bus.emit('meta:changed', {});
  bus.emit('run:events', {});
  assert.equal(calls, 0, 'disposed bus handlers must not run');
});

test('scope: nothing can be added after dispose', () => {
  const win = fakeTarget();
  const scope = createScope();
  scope.dispose();
  scope.on(win, 'click', () => {});
  scope.sub(bus, 'meta:changed', () => { throw new Error('should never run'); });
  bus.emit('meta:changed', {});
  assert.equal(win.total(), 0);
});

test('scope: a failing cleanup does not stop the others', () => {
  const win = fakeTarget();
  const scope = createScope();
  scope.on(win, 'click', () => {});
  scope.add(() => { throw new Error('bad cleanup'); });
  scope.dispose();
  assert.equal(win.total(), 0);
});

test('every screen file uses a scope for its listeners', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../src/ui/screens/', import.meta.url);
  const bare = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    if (/bus\.on\(/.test(src) && !/createScope|scope/.test(src)) bare.push(f);
  }
  assert.deepEqual(bare, [], 'screens must subscribe through a scope: ' + bare.join(', '));
});
