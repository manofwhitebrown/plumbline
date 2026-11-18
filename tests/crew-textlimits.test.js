import test from 'node:test';
import { CREW } from '../src/data/crew.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

test('crew names fit 22 characters', () => checkLimit('crew name', CREW.map((c) => [c.id, c.name]), LIMITS.listName));
test('crew descriptions fit 80 characters', () => checkLimit('crew description', CREW.map((c) => [c.id, c.desc]), LIMITS.listDesc));
