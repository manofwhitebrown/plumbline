// 30 achievements. Each unlocks once, pays Shards, and sends an event.
import { ACHIEVEMENTS } from '../data/rewards.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { s, changed } from './state.js';
import { now } from './time.js';
import { addShards } from './wallet.js';
import { get as getStats } from './stats.js';
import { num } from './safe.js';

export function check() {
  const st = s();
  if (st.cheated) return [];          // cheaters earn nothing
  const stats = getStats();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (st.achievements[a.id]) continue;
    if (num(stats[a.stat]) >= a.gte) {
      st.achievements[a.id] = now();
      addShards(a.shards);
      fresh.push(a.id);
    }
  }
  if (fresh.length) {
    changed('achievements');
    for (const id of fresh) {
      try { bus.emit('achievement:unlocked', { id }); } catch (e) { log.warn('achievement emit failed', e && e.message); }
    }
  }
  return fresh;
}

export function list() {
  const st = s();
  const stats = getStats();
  return ACHIEVEMENTS.map((a) => {
    const value = num(stats[a.stat]);
    return {
      id: a.id, name: a.name, desc: a.desc, shards: a.shards,
      unlocked: !!st.achievements[a.id], target: a.gte,
      progress: Math.min(value, a.gte), fraction: Math.min(1, value / a.gte),
    };
  });
}

// Cheat helper: unlock all (flagged by the caller).
export function unlockAll() {
  const st = s();
  for (const a of ACHIEVEMENTS) if (!st.achievements[a.id]) st.achievements[a.id] = now();
  changed('achievements');
}
