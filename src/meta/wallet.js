// Gold, Shards and Core Dust. Every change goes through here so values stay safe.
import { s, changed } from './state.js';
import { money, num } from './safe.js';
import { advance } from './quests.js';

// opts.free = true: money that is not "earned" (cheats). It does not count toward records.
export function addGold(n, opts) {
  const x = num(n);
  if (!(x > 0)) return 0;
  const st = s();
  const before = st.gold;
  st.gold = money(st.gold + x);
  const gained = st.gold - before;
  if (!(opts && opts.free)) {
    st.goldThisCollapse = money(st.goldThisCollapse + gained);
    st.stats.goldEarned = money(st.stats.goldEarned + gained);
    advance('goldEarned', gained);
  }
  return gained;
}

export function spendGold(n) {
  const x = num(n, -1);
  if (!(x >= 0)) return false;
  const st = s();
  if (st.gold < x) return false;
  st.gold = money(st.gold - x);
  changed('gold');
  return true;
}

export function addShards(n) {
  const x = num(n);
  if (!(x > 0)) return 0;
  const st = s();
  const before = st.shards;
  st.shards = money(st.shards + x);
  changed('shards');
  return st.shards - before;
}

export function spendShards(n) {
  const x = num(n, -1);
  if (!(x >= 0)) return false;
  const st = s();
  if (st.shards < x) return false;
  st.shards = money(st.shards - x);
  changed('shards');
  return true;
}

export function addCoreDust(n) {
  const x = Math.floor(num(n));
  if (!(x > 0)) return 0;
  const st = s();
  st.coreDust = money(st.coreDust + x);
  st.coreDustTotal = money(st.coreDustTotal + x);
  changed('coredust');
  return x;
}
