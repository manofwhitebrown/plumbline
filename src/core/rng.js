// Seeded random numbers (mulberry32). Same seed gives the same sequence.
// No Math.random anywhere, so runs can be replayed exactly.

// Turn any seed (number, string, junk) into a 32-bit whole number.
function seedToInt(seed) {
  if (typeof seed === 'string') {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  const n = Number(seed);
  if (!Number.isFinite(n)) return 0;
  return (Math.floor(n) >>> 0);
}

export function makeRng(seed) {
  let s = seedToInt(seed);

  // Float in [0, 1).
  function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Whole number from a to b, both included. Swaps them if they come in the wrong order.
  function int(a, b) {
    let lo = Math.floor(Number(a));
    let hi = Math.floor(Number(b));
    if (!Number.isFinite(lo)) lo = 0;
    if (!Number.isFinite(hi)) hi = lo;
    if (lo > hi) { const t = lo; lo = hi; hi = t; }
    return lo + Math.floor(next() * (hi - lo + 1));
  }

  // One random item from a list. Empty or bad list gives undefined.
  function pick(arr) {
    if (!arr || !arr.length) { next(); return undefined; }
    return arr[Math.floor(next() * arr.length)];
  }

  // True with chance p (0..1). Bad p counts as 0.
  function chance(p) {
    const v = next();
    const n = Number(p);
    return Number.isFinite(n) && v < n;
  }

  // Pick a value from [[value, weight], ...]. Zero, negative and bad weights are ignored.
  // If nothing has a usable weight, the first value is returned. Always uses exactly one random number.
  function weighted(pairs) {
    const r = next();
    if (!Array.isArray(pairs) || !pairs.length) return undefined;
    let total = 0;
    for (let i = 0; i < pairs.length; i++) {
      const w = pairs[i] && Number(pairs[i][1]);
      if (Number.isFinite(w) && w > 0) total += w;
    }
    if (total <= 0) return pairs[0] ? pairs[0][0] : undefined;
    let x = r * total;
    let last;
    for (let i = 0; i < pairs.length; i++) {
      const w = pairs[i] && Number(pairs[i][1]);
      if (!Number.isFinite(w) || w <= 0) continue;
      last = pairs[i][0];
      if (x < w) return last;
      x -= w;
    }
    return last;
  }

  return { next, int, pick, chance, weighted };
}

export default makeRng;
