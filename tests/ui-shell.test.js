import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as shell from '../src/ui/shell.js';

beforeEach(() => shell._resetForTests());

function fake(log, name) {
  return { mount() { log.push('mount ' + name); }, unmount() { log.push('unmount ' + name); } };
}

test('go mounts and unmounts in order', () => {
  const log = [];
  shell.registerScreen('home', fake(log, 'home'));
  shell.registerScreen('rig', fake(log, 'rig'));
  assert.equal(shell.go('home'), true);
  assert.equal(shell.go('rig'), true);
  assert.deepEqual(log, ['mount home', 'unmount home', 'mount rig']);
  assert.equal(shell.currentId(), 'rig');
});

test('back returns to the last screen and stops at the start', () => {
  const log = [];
  shell.registerScreen('home', fake(log, 'home'));
  shell.registerScreen('rig', fake(log, 'rig'));
  shell.go('home');
  shell.go('rig');
  assert.equal(shell.back(), true);
  assert.equal(shell.currentId(), 'home');
  assert.equal(shell.back(), false);
});

test('unknown screen and bad input fail soft', () => {
  assert.equal(shell.go('nope'), false);
  assert.equal(shell.registerScreen(null, null), false);
  assert.equal(shell.registerScreen('x', {}), false);
  assert.equal(shell.modal(null), null);
});

test('a screen that throws does not break the shell', () => {
  shell.registerScreen('bad', { mount() { throw new Error('boom'); }, unmount() {} });
  shell.registerScreen('home', fake([], 'home'));
  assert.equal(shell.go('bad'), false);
  assert.equal(shell.go('home'), true);
});

test('toast keeps text safe', () => {
  const t = shell.toast(undefined, 'ok');
  assert.equal(t.text, '');
  assert.equal(shell._recentToasts().length, 1);
});
