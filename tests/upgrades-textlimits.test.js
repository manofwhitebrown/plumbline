import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES } from '../src/data/upgrades.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

test('upgrade names fit 22 characters', () => checkLimit('upgrade name', UPGRADES.map((u) => [u.id, u.name]), LIMITS.listName));
test('upgrade descriptions fit 80 characters', () => checkLimit('upgrade description', UPGRADES.map((u) => [u.id, u.desc]), LIMITS.listDesc));
// "unit" is shown after the number, for example "+10 max Strain". Keep it short so the row does not wrap badly.
test('upgrade unit labels fit 20 characters', () => checkLimit('upgrade unit', UPGRADES.map((u) => [u.id, u.unit]), 20));
