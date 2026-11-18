// The tutorial finds things by data-tut. These marks must stay in the source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('Home, tab bar and Rig carry the tutorial marks', () => {
  assert.match(read('src/ui/screens/home.js'), /data-tut', 'home-drop'/);
  assert.match(read('src/ui/components/tabbar.js'), /'tab-' \+ t\.id/);
  const grid = read('src/ui/screens/rigGrid.js');
  assert.match(grid, /'rig-grid'/);
  assert.match(grid, /'rig-cell'/);
  assert.match(read('src/ui/screens/rigTray.js'), /rig-new-part/);
  assert.match(read('src/ui/screens/rig.js'), /rig-drop/);
});

test('Rig grid: Delete removes the focused part', () => {
  assert.match(read('src/ui/screens/rigGrid.js'), /Delete/);
  assert.match(read('src/ui/screens/rig.js'), /onRemove/);
});

test('Workshop marks affordable parts for the tutorial', () => {
  assert.match(read('src/ui/screens/workshopParts.js'), /workshop-part/);
});
