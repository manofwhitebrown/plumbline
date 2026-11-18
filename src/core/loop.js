// Game loop. Beats run on a fixed step (beatMs). Frames run as fast as the screen allows.
//  - onBeat() is called once per beat.
//  - onFrame(dtMs, alpha) is called every animation frame. alpha = progress to the next beat (0..1).
// Safe against: long pauses (dt is clamped to 250 ms), too many beats in one frame (capped, extra time is dropped),
// a hidden tab (pauses by itself), and errors in your callbacks (logged, loop keeps going).
// onFrame is not called while paused or stopped.
import { log } from './log.js';

const MAX_DT = 250;
const MAX_BEATS_PER_FRAME = 8;
const BUDGET_MS = 8;           // never spend more than this on beats in one frame
const MIN_BEAT = 16;
const MAX_BEAT = 10000;

function clampBeat(ms, fallback) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(MAX_BEAT, Math.max(MIN_BEAT, n));
}

export function createLoop(opts = {}) {
  const onBeat = typeof opts.onBeat === 'function' ? opts.onBeat : null;
  const onFrame = typeof opts.onFrame === 'function' ? opts.onFrame : null;
  // These three can be swapped in tests.
  const nowFn = opts.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf = opts.raf || (typeof requestAnimationFrame === 'function' ? (f) => requestAnimationFrame(f) : (f) => setTimeout(() => f(nowFn()), 16));
  const caf = opts.caf || (typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id));

  let beatMs = clampBeat(opts.beatMs, 450);
  let started = false;     // start() was called and stop() was not
  let paused = false;      // pause() was called
  let hidden = false;      // the tab is hidden
  let handle = null;
  let last = 0;
  let acc = 0;
  let fails = 0;

  function active() { return started && !paused && !hidden; }

  function guard(fn, a, b) {
    try { fn(a, b); } catch (err) {
      if (fails++ < 20) log.error('loop callback failed', err); // do not flood the log
    }
  }

  function tick(t) {
    handle = null;
    if (!active()) return;
    let dt = Number(t) - last;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    if (dt > MAX_DT) dt = MAX_DT;
    last = Number(t) > last ? Number(t) : last;
    acc += dt;

    if (onBeat) {
      const t0 = nowFn();
      let n = 0;
      while (acc >= beatMs && n < MAX_BEATS_PER_FRAME) {
        guard(onBeat);
        acc -= beatMs;
        n++;
        if (nowFn() - t0 > BUDGET_MS) break;
      }
      if (acc >= beatMs) acc = acc % beatMs; // too far behind: drop the extra time, never spiral
    } else if (acc >= beatMs) {
      acc = acc % beatMs;
    }

    if (onFrame) guard(onFrame, dt, Math.min(1, Math.max(0, acc / beatMs)));
    schedule();
  }

  function schedule() {
    if (handle === null && active()) handle = raf(tick);
  }

  function halt() {
    if (handle !== null) { caf(handle); handle = null; }
  }

  function begin() {
    last = nowFn();
    schedule();
  }

  // ---- hidden tab ----
  let offVis = null;
  function watchVisibility() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    const onVis = () => {
      const nowHidden = !!document.hidden;
      if (nowHidden === hidden) return;
      hidden = nowHidden;
      if (hidden) halt();
      else if (started && !paused) begin(); // come back without a time jump
    };
    document.addEventListener('visibilitychange', onVis);
    hidden = !!document.hidden;
    offVis = () => document.removeEventListener('visibilitychange', onVis);
  }

  return {
    start() {
      if (started) return;
      started = true; paused = false; acc = 0; fails = 0;
      watchVisibility();
      if (active()) begin();
    },
    stop() {
      started = false; paused = false; acc = 0;
      halt();
      if (offVis) { offVis(); offVis = null; }
    },
    pause() {
      if (!started || paused) return;
      paused = true;
      halt();
    },
    resume() {
      if (!started || !paused) return;
      paused = false;
      if (active()) begin();
    },
    setBeatMs(ms) {
      const next = clampBeat(ms, NaN);
      if (Number.isNaN(next)) { log.warn('setBeatMs ignored a bad value'); return; }
      beatMs = next;
    },
    isRunning() { return active(); }
  };
}

export default createLoop;
