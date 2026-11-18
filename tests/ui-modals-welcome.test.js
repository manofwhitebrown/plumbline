import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { welcomeKey, shouldShowWelcome, awayText, nextFocusIndex, openFrame, openWelcomeBack, maybeWelcomeBack, _resetWelcomeForTests } from '../src/ui/modalsWelcome.js';
import * as shell from '../src/ui/shell.js';

beforeEach(() => { _resetWelcomeForTests(); shell._resetForTests(); });

test('Welcome back shows only when there is Gold waiting', () => {
  assert.equal(shouldShowWelcome({ ms: 3600000, gold: 500 }, ''), true);
  for (const bad of [null, undefined, {}, { ms: 1, gold: 0 }, { ms: 1, gold: -4 }, { gold: NaN }, 'x', 7]) {
    assert.equal(shouldShowWelcome(bad, ''), false);
  }
});

test('the same pile is not shown again after the player closed it', () => {
  const off = { ms: 7200000, gold: 1234 };
  const key = welcomeKey(off);
  assert.equal(shouldShowWelcome(off, key), false);
  assert.equal(shouldShowWelcome({ ms: 7200000, gold: 1300 }, key), true, 'a bigger pile shows again');
  assert.equal(welcomeKey(null), '');
});

test('away text uses plain words and handles tiny or bad times', () => {
  assert.match(awayText(3 * 3600000 + 5 * 60000), /^Your Crew worked for .+ while you were away\.$/);
  assert.equal(awayText(10), 'Your Crew kept working while you were away.');
  assert.equal(awayText(NaN), 'Your Crew kept working while you were away.');
  assert.equal(/\b(beat|tick|lane)\b/i.test(awayText(99999999)), false);
});

test('Tab stays inside the box', () => {
  assert.equal(nextFocusIndex(2, 3, false), 0, 'last goes to first');
  assert.equal(nextFocusIndex(0, 3, true), 2, 'first goes back to last');
  assert.equal(nextFocusIndex(0, 3, false), 1);
  assert.equal(nextFocusIndex(2, 3, true), 1);
  assert.equal(nextFocusIndex(-1, 3, false), 0, 'from outside goes to first');
  assert.equal(nextFocusIndex(0, 0, false), -1);
  assert.equal(nextFocusIndex(NaN, NaN, true), -1);
});

test('opening a modal with no page never throws', () => {
  // The shell has no layer here, so the shell gives back a do-nothing handle.
  assert.doesNotThrow(() => openFrame({ title: 'x', body: null }));
  assert.doesNotThrow(() => openFrame(null));
  assert.doesNotThrow(() => openWelcomeBack({ ms: 1, gold: 5 }));
  assert.doesNotThrow(() => maybeWelcomeBack());
});
