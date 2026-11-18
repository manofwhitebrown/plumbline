// A quest has one line of text. It is the quest name on screen, so it follows the 22 character name limit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS } from '../src/data/rewards.js';
import { LIMITS, checkLimit } from './integration-layout-helpers.js';

test('quest text fits 22 characters', () => checkLimit('quest text', QUESTS.map((q) => [q.id, q.text]), LIMITS.listName));
