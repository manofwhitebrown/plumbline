// [PERF-1] Frame-time governor. Watches real frame times and walks a ladder of quality tiers:
//   high -> medium -> reduced -> minimal   (fewer layers, no baking, fewer particles as it goes down)
// It steps DOWN fast (a slow second is enough) and steps UP slowly. After an up-step that fails soon after, the
// wait before the next try doubles (8 s, 16 s, ... 2 min), so a phone that cannot hold 'high' does not flicker.
// Pure logic: no canvas, no timers, no allocation per frame. The renderer applies the tier (see render/index.js).
export const TIERS = [
  { name: 'high', depth: 'high', bake: true, particles: 1 },
  { name: 'medium', depth: 'medium', bake: true, particles: 0.75 },
  { name: 'reduced', depth: 'medium', bake: false, particles: 0.5 },
  { name: 'minimal', depth: 'low', bake: false, particles: 0.35 },
];
export const GOV = {
  slowMs: 20,        // mean frame time over the window that counts as slow (about 50 fps)
  window: 45,        // frames (about 0.75 s at 60 fps)
  goodMs: 18,        // a frame at or under this is calm (60 fps frames are 16.7)
  badMs: 24,         // a frame over this breaks the calm streak
  upWaitMs: 8000,    // calm time needed before trying one tier up
  maxUpWaitMs: 120000,
  probationMs: 30000, // an up-step that lasts this long counts as safe: the wait goes back to the start
  fastMs: 40,        // [PERF-2] a frame over this is very slow (under 25 fps)
  fastRun: 6,        // [PERF-2] this many very slow frames IN A ROW step down at once (on a slow phone 45 frames take 10 s or more)
  hiddenMs: 250,     // longer than this is a hidden tab, not a slow game: ignored
};

export function createGovernor(opts = {}) {
  const o = opts || {};
  const cfg = Object.assign({}, GOV, o.config || {});
  const tiers = o.tiers || TIERS, max = tiers.length - 1, onChange = typeof o.onChange === 'function' ? o.onChange : null;
  const ring = new Float64Array(cfg.window);
  let n = 0, head = 0, sum = 0, run = 0, step = 0, calm = 0, upWait = cfg.upWaitMs, sinceUp = Infinity, enabled = true;

  function clearWindow() { n = 0; head = 0; sum = 0; run = 0; }
  function change(to) {
    if (to === step) return;
    step = to; clearWindow(); calm = 0;
    if (onChange) { try { onChange(step, tiers[step]); } catch (e) { /* the loop must survive */ } }
  }
  return {
    get step() { return step; },
    get tier() { return tiers[step]; },
    get enabled() { return enabled; },
    get upWait() { return upWait; },
    get mean() { return n ? sum / n : 0; },
    // The player picked a level by hand: the governor goes quiet and everything is at full tier.
    setEnabled(on) { enabled = !!on; clearWindow(); calm = 0; if (!enabled) change(0); },
    reset() { clearWindow(); calm = 0; upWait = cfg.upWaitMs; sinceUp = Infinity; change(0); },
    // Call once per frame with the raw frame time in ms. Returns the current step.
    sample(dtMs) {
      if (!enabled || !Number.isFinite(dtMs) || dtMs <= 0) return step;
      if (dtMs > cfg.hiddenMs) { clearWindow(); calm = 0; return step; }
      if (sinceUp < Infinity) { sinceUp += dtMs; if (sinceUp >= cfg.probationMs) { upWait = cfg.upWaitMs; sinceUp = Infinity; } }
      if (n === cfg.window) sum -= ring[head]; else n++;
      ring[head] = dtMs; sum += dtMs; head = (head + 1) % cfg.window;
      run = dtMs > cfg.fastMs ? run + 1 : 0;
      if (((n === cfg.window && sum / n > cfg.slowMs) || run >= cfg.fastRun) && step < max) {
        if (sinceUp < Infinity) { upWait = Math.min(cfg.maxUpWaitMs, upWait * 2); sinceUp = Infinity; } // the last raise did not hold
        change(step + 1); return step;
      }
      if (dtMs <= cfg.goodMs) calm += dtMs; else if (dtMs > cfg.badMs) calm = 0;
      if (step > 0 && calm >= upWait) { sinceUp = 0; change(step - 1); }
      return step;
    },
    stats() { return { step, tier: tiers[step].name, meanMs: n ? sum / n : 0, upWaitMs: upWait, calmMs: calm }; },
  };
}
