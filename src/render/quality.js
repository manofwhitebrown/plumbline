// Auto quality: if frames stay slower than 24 ms for 2 s, first switch off the cheapest-to-lose layer
// (one per slow window, least important first), and only when none is left drop to 'low'.
export const QUALITY = {
  high: { name: 'high', maxParticles: 300, fog: true, layers: 3, motes: 36 },
  low: { name: 'low', maxParticles: 110, fog: false, layers: 2, motes: 12 },
};
export const SLOW_MS = 24;
export const SLOW_WINDOW_MS = 2000;
// [PERF-2] After an AUTOMATIC drop to low, try high again once frames have been calm for a while. A failed try doubles the wait.
export const RECOVER = { calmMs: 20000, maxCalmMs: 300000, goodMs: 20, holdMs: 20000 };

export function createQuality(initial = 'high', onChange = null) {
  let level = initial === 'low' ? 'low' : 'high';
  let slow = 0;
  let locked = false; // true when the player or lab picked a level
  let autoLow = false, calm = 0, wait = RECOVER.calmMs, hold = Infinity; // [PERF-2] recovery from an automatic low
  const layers = [];  // { name, importance, cost, active, off(), on() }
  const call = (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { /* a layer must never break the loop */ } };
  // Least important first; among equals the costliest goes first.
  function nextLayer() {
    let best = null;
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i]; if (!l.active) continue;
      if (!best || l.importance < best.importance || (l.importance === best.importance && l.cost > best.cost)) best = l;
    }
    return best;
  }
  return {
    get level() { return level; },
    get settings() { return QUALITY[level]; },
    // A layer registers its importance (1 = lose first), its relative cost, and how to turn itself off and on.
    registerLayer(name, { importance = 5, cost = 1, off = null, on = null } = {}) {
      const i = layers.findIndex((l) => l.name === name);
      const l = { name: String(name), importance: Number(importance) || 5, cost: Number(cost) || 1, active: true, off, on };
      if (i >= 0) layers[i] = l; else layers.push(l);
    },
    layerState() { return layers.map((l) => ({ name: l.name, importance: l.importance, cost: l.cost, active: l.active })); },
    get locked() { return locked; },
    // Back to automatic: the player chose 'auto', so slow frames may lower quality again.
    setAuto() { locked = false; slow = 0; autoLow = false; calm = 0; wait = RECOVER.calmMs; hold = Infinity; if (level === 'low') { level = 'high'; for (const l of layers) if (!l.active) { l.active = true; call(l.on); } if (onChange) onChange(level); } },
    set(name, byUser = true) {
      const n = name === 'low' ? 'low' : 'high';
      if (byUser) locked = true;
      slow = 0; autoLow = false; calm = 0; hold = Infinity;
      if (n === 'high') for (const l of layers) if (!l.active) { l.active = true; call(l.on); } // bring every layer back
      if (n !== level) { level = n; if (onChange) onChange(level); }
    },
    // Call every frame with the real frame time.
    sample(dtMs) {
      if (locked || !Number.isFinite(dtMs)) return level;
      if (dtMs > 250) { slow = 0; calm = 0; return level; } // tab was hidden: ignore
      if (level === 'low') { // [PERF-2] only an automatic low can come back; a hand-picked low (locked) returned above
        if (!autoLow) return level;
        calm = dtMs <= RECOVER.goodMs ? calm + dtMs : 0;
        if (calm >= wait) { calm = 0; slow = 0; hold = 0; level = 'high'; for (const l of layers) if (!l.active) { l.active = true; call(l.on); } if (onChange) onChange(level); }
        return level;
      }
      if (hold < Infinity) { hold += dtMs; if (hold >= RECOVER.holdMs) { hold = Infinity; wait = RECOVER.calmMs; } } // the raise held: the wait starts over
      if (dtMs > SLOW_MS) slow += dtMs; else slow = Math.max(0, slow - dtMs * 0.5);
      if (slow >= SLOW_WINDOW_MS) {
        slow = 0;
        const l = nextLayer();
        if (l) { l.active = false; call(l.off); } // one step at a time
        else {
          if (hold < Infinity) wait = Math.min(RECOVER.maxCalmMs, wait * 2); // the last raise did not hold
          hold = Infinity; level = 'low'; autoLow = true; calm = 0; if (onChange) onChange(level);
        }
      }
      return level;
    },
  };
}
