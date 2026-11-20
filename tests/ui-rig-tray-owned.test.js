import test from 'node:test';
import assert from 'node:assert/strict';
import { countIds } from '../src/ui/screens/rigTray.js';

test('tray counts owned parts given as a map (the real game format)', () => {
  assert.deepEqual(countIds({ hook: 1, magnet: 2 }), { hook: 1, magnet: 2 });
});
test('tray still counts a plain list and ignores bad input', () => {
  assert.deepEqual(countIds(['hook', 'hook', 'net']), { hook: 2, net: 1 });
  assert.deepEqual(countIds({ hook: 0, net: -1, x: 'a' }), {});
  assert.deepEqual(countIds(null), {});
});
