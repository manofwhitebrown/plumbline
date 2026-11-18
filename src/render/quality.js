// Auto quality: if frames stay slower than 24 ms for 2 s, switch to 'low'.
export const QUALITY = {
  high: { name: 'high', maxParticles: 300, fog: true, layers: 3, motes: 36 },
  low: { name: 'low', maxParticles: 110, fog: false, layers: 2, motes: 12 },
};
export const SLOW_MS = 24;
export const SLOW_WINDOW_MS = 2000;

export function createQuality(initial = 'high', onChange = null) {
  let level = initial === 'low' ? 'low' : 'high';
  let slow = 0;
  let locked = false; // true when the player or lab picked a level
  return {
    get level() { return level; },
    get settings() { return QUALITY[level]; },
    set(name, byUser = true) {
      const n = name === 'low' ? 'low' : 'high';
      if (byUser) locked = true;
      slow = 0;
      if (n !== level) { level = n; if (onChange) onChange(level); }
    },
    // Call every frame with the real frame time.
    sample(dtMs) {
      if (locked || level === 'low' || !Number.isFinite(dtMs)) return level;
      if (dtMs > 250) { slow = 0; return level; } // tab was hidden: ignore
      if (dtMs > SLOW_MS) slow += dtMs; else slow = Math.max(0, slow - dtMs * 0.5);
      if (slow >= SLOW_WINDOW_MS) { slow = 0; level = 'low'; if (onChange) onChange(level); }
      return level;
    },
  };
}
