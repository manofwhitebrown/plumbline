// One small helper for "1 Shard" versus "2 Shards". Fails soft: bad input counts as many.
// Gold and Core Dust never change (they are not counted in pieces), so they do not use this.
import { fmt } from './format.js';

// plural(1, 'Shard') -> 'Shard'; plural(2, 'Shard') -> 'Shards'; plural(2, 'Berry', 'Berries') -> 'Berries'.
export function plural(n, one, many) {
  const v = typeof n === 'number' ? n : Number(n);
  const word = String(one == null ? '' : one);
  if (v === 1) return word;
  return many != null ? String(many) : word + 's';
}

// countText(1, 'Shard') -> '1 Shard'; countText(1500, 'gem') -> '1.5K gems'. Uses the shared number format.
export function countText(n, one, many) {
  const v = typeof n === 'number' ? n : Number(n);
  return fmt(v) + ' ' + plural(v, one, many);
}
