// Plain data for the Relic Wall and Looks panels. No page needed, so tests can run it. [HOOK-3]
import * as book from '../../meta/relicBook.js';
import * as looks from '../../meta/cosmetics.js';
import { KIND_LABEL, LOOK_KINDS, WALL_TOTAL } from '../../data/cosmetics.js';
import { s as metaState } from '../../meta/state.js';
import { plural } from '../../core/plural.js';

const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

export function wallModel() {
  const cards = safe(() => book.list(), []);
  const w = safe(() => book.wall(), { found: 0, earned: 0, total: WALL_TOTAL, bonuses: [], next: null });
  const groups = [];
  for (const c of cards) {
    let g = groups[groups.length - 1];
    if (!g || g.biome !== c.biome) { g = { biome: c.biome, name: c.where, cards: [] }; groups.push(g); }
    g.cards.push(c);
  }
  const left = w.next ? Math.max(0, w.next.at - w.earned) : 0;
  const nextLine = w.next ? left + ' more ' + plural(left, 'relic') + ' for ' + w.next.text : 'Every Wall bonus is yours.';
  return { found: w.found, total: w.total, bonuses: w.bonuses, nextLine, groups, unseen: safe(() => book.unseenCount(), 0) };
}

export function looksModel() {
  const shards = safe(() => Number(metaState().shards) || 0, 0);
  return {
    shards,
    groups: LOOK_KINDS.map((k) => ({ kind: k, label: KIND_LABEL[k], items: safe(() => looks.list(k), []) })),
    unseen: safe(() => looks.unseenCount(), 0),
  };
}

export function wallBadge() { return safe(() => book.unseenCount(), 0); }
export function looksBadge() { return safe(() => looks.unseenCount(), 0); }

