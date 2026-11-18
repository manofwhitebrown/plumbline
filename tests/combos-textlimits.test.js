import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_DATA } from '../src/data/parts.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

const combos = Object.entries(COMBO_DATA);

test('there are combos to check', () => assert.ok(combos.length >= 10));
test('combo names fit 20 characters', () => checkLimit('combo name', combos.map(([id, c]) => [id, c.name]), LIMITS.comboName));
test('combo descriptions fit 90 characters', () => checkLimit('combo description', combos.map(([id, c]) => [id, c.desc]), LIMITS.comboDesc));
