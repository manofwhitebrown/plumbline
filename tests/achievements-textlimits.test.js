import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS } from '../src/data/rewards.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

test('there are 30 achievements', () => assert.equal(ACHIEVEMENTS.length, 30));
test('achievement names fit 22 characters', () => checkLimit('achievement name', ACHIEVEMENTS.map((a) => [a.id, a.name]), LIMITS.listName));
test('achievement descriptions fit 80 characters', () => checkLimit('achievement description', ACHIEVEMENTS.map((a) => [a.id, a.desc]), LIMITS.listDesc));
