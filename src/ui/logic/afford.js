// Affordability text and buy-many math. Costs grow by 1.15 for each one owned.
const GROWTH = 1.15;

export function affordText(cost, have, noun, fmt) {
  const f = typeof fmt === 'function' ? fmt : String;
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, text: 'Not available' };
  const h = Number.isFinite(have) ? have : 0;
  if (h >= cost) return { ok: true, text: '' };
  return { ok: false, text: 'Need ' + f(Math.ceil(cost - h)) + ' more ' + noun };
}

// Cost to buy `count` more when `owned` are owned already.
export function bulkCost(base, owned, count, growth) {
  const g = Number.isFinite(growth) && growth > 1 ? growth : GROWTH;
  const n = Math.max(0, Math.floor(count) || 0);
  const o = Math.max(0, Math.floor(owned) || 0);
  if (!Number.isFinite(base) || base < 0 || n === 0) return 0;
  return base * Math.pow(g, o) * (Math.pow(g, n) - 1) / (g - 1);
}

// How many can we afford? Capped so a huge wallet cannot freeze the screen.
export function maxAffordable(base, owned, gold, growth, cap) {
  const limit = Number.isFinite(cap) ? cap : 500;
  let n = 0;
  while (n < limit && bulkCost(base, owned, n + 1, growth) <= gold) n++;
  return n;
}

// The count to show for a toggle: 1, 10 or 'max'.
export function buyCount(mode, base, owned, gold, growth) {
  if (mode === 'max') return Math.max(1, maxAffordable(base, owned, gold, growth));
  return mode === 10 ? 10 : 1;
}
