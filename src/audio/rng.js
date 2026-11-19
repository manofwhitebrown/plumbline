// Small seeded random numbers (mulberry32). Same seed, same sequence, so music is varied but repeatable.
export function createRng(seed = 1) {
  let s = (Number(seed) >>> 0) || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + next() * (b - a),
    int: (n) => Math.floor(next() * Math.max(1, n)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    reseed: (v) => {
      s = (Number(v) >>> 0) || 1;
    },
  };
}

// Turn any string into a small stable number (for tuning a sound to a part id).
export function hashString(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
