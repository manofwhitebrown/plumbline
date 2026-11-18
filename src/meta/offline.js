// Away income. Capped, 60% efficiency, never negative, safe against clock changes.
import { OFFLINE } from '../data/crew.js';
import { s, changed } from './state.js';
import { now } from './time.js';
import { money, count, clamp } from './safe.js';
import { level } from './upgrades.js';
import { perSecond } from './crew.js';
import { addGold } from './wallet.js';

export function capMs() {
  return OFFLINE.baseCapMs + level('vault') * 3600 * 1000;
}
export function efficiency() {
  return clamp(OFFLINE.efficiency + 0.05 * level('cd_offline'), 0, OFFLINE.maxEfficiency);
}

// Gold for an away time. ms is clamped to [0, cap].
export function goldFor(ms) {
  const m = clamp(ms, 0, capMs());
  return money((m / 1000) * perSecond() * efficiency());
}

// Mark "the player was here just now". Never moves time backwards past a future stamp problem:
// if the saved stamp is in the future (clock moved back), we simply reset it to now.
export function touch() {
  s().lastSeen = now();
}

function addPending(ms) {
  const st = s();
  const prev = st.offlinePending;
  const total = Math.min(capMs(), (prev ? prev.ms : 0) + clamp(ms, 0, capMs()));
  const gold = goldFor(total);
  st.offlinePending = gold > 0 ? { ms: count(total, 1e12), gold } : null;
  return st.offlinePending;
}

// Call on boot. Returns { ms, gold } if the player was away 1 minute or more and there is gold to claim.
export function peek() {
  const st = s();
  const t = now();
  const last = st.lastSeen;
  let away = 0;
  if (last > 0 && t > last) away = Math.min(t - last, capMs());
  if (!Number.isFinite(away)) away = 0;
  if (away >= OFFLINE.minAwayMs) {
    addPending(away);
    st.lastSeen = t;
    changed('offline');
  } else if (last <= 0 || last > t) {
    st.lastSeen = t; // first run, or the clock moved back
  }
  const p = st.offlinePending;
  return p ? { ms: p.ms, gold: p.gold } : null;
}

// Pay the waiting gold once.
export function claim() {
  const st = s();
  const p = st.offlinePending;
  st.lastSeen = now();
  if (!p) return { ok: false, gold: 0 };
  st.offlinePending = null;
  const paid = addGold(p.gold);
  changed('gold');
  return { ok: true, gold: paid, ms: p.ms };
}

// Cheat helper: pretend the player was away this long.
export function skip(ms) {
  const p = addPending(ms);
  changed('offline');
  return p ? { ms: p.ms, gold: p.gold } : null;
}
