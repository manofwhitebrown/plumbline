// motion/results.js: spring choreography for the Results screen, layered on the screen's own staged reveal (resultsReveal.js).
// It adds the motion; it never changes which rows show or when. It watches the rows gain their "in" class:
//   title and depth settle with a small spring, the gold count-up ticks (rising pitch), shards fly into the shard pill,
//   done goals get stamped, and the buttons slide up. A tap anywhere ends all of it. Reduce motion: nothing moves.
// Transform and opacity only (WAAPI with composite "add", so the CSS reveal underneath is untouched).
import { ease } from './easing.js';

const SPRING = 'cubic-bezier(0.2, 0.9, 0.25, 1.08)';

// Pure: the pitch step (0..1) for the n-th tick of a count-up from 0 to the target. Ticks speed up and rise, then stop.
export function tickPlan(totalTicks, durMs) {
  const n = Math.max(1, Math.min(24, totalTicks | 0)), out = [];
  for (let i = 0; i < n; i++) { const k = (i + 1) / n; out.push({ at: Math.round(durMs * ease.out(k) * 0.98), pitch: k }); }
  return out;
}

export function attachResults(screen, opts) {
  const o = opts || {};
  const isReduced = typeof o.isReduced === 'function' ? o.isReduced : () => false;
  const cue = typeof o.cue === 'function' ? o.cue : () => {};
  const fly = typeof o.fly === 'function' ? o.fly : () => {};
  const live = new Set(); const timers = new Set(); const seen = new Set();
  let mo = null, disposed = false;
  const R = { plays: 0 };
  if (!screen || !screen.querySelector) return Object.assign(R, { dispose() {} });
  const reduce = isReduced();
  const snapped = !!(screen.classList && screen.classList.contains('snapped'));

  const add = (el, frames, ms, easing, delay) => {
    if (reduce || !el || typeof el.animate !== 'function') return null;
    let a = null;
    try { a = el.animate(frames, { duration: ms, delay: delay || 0, easing: easing || SPRING, fill: 'backwards', composite: 'add' }); } catch (e) { return null; }
    live.add(a); a.onfinish = a.oncancel = () => live.delete(a); R.plays++;
    return a;
  };
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!disposed) fn(); }, ms); timers.add(t); };

  function onIn(el) {
    if (reduce || disposed) return;
    const k = snapped ? 0.5 : 1; // a snap enters calmer: half the overshoot
    if (el.classList.contains('res-title')) add(el, [{ transform: 'scale(' + (-0.08 * k) + ')' }, { transform: 'scale(0.02)', offset: 0.7 }, { transform: 'scale(0)' }], 480);
    else if (el.classList.contains('res-depth')) add(el, [{ transform: 'scale(' + (-0.06 * k) + ')' }, { transform: 'scale(0)' }], 420);
    else if (el.classList.contains('res-gold')) tickGold(el);
    else if (el.classList.contains('res-shards')) flyShards(el);
    else if (el.classList.contains('res-goals')) stampGoals(el);
    else if (el.classList.contains('res-actions')) add(el, [{ opacity: -1, transform: 'translate3d(0,28px,0)' }, { opacity: 0, transform: 'translate3d(0,0,0)' }], 460);
    else if (el.classList.contains('res-record')) add(el, [{ transform: 'scale(-0.4)' }, { transform: 'scale(0.06)', offset: 0.6 }, { transform: 'scale(0)' }], 520);
  }

  // gold: ticks with a rising pitch while the number counts up. The pitch is a hint to the audio cue (kind 'tick', pitch 0..1).
  function tickGold(row) {
    const num = row.querySelector('.num, .big-num'); if (!num) return;
    const dur = 900;
    for (const t of tickPlan(14, dur)) later(() => cue('tick', t.pitch), t.at);
    add(num, [{ transform: 'scale(0)' }, { transform: 'scale(0.06)', offset: 0.85 }, { transform: 'scale(0)' }], dur + 120, 'ease-out');
  }
  function flyShards(row) { try { fly('shards', row); } catch (e) { /* decoration only */ } add(row, [{ transform: 'scale(-0.1)' }, { transform: 'scale(0)' }], 360); }
  function stampGoals(list) {
    const items = list.querySelectorAll('.res-goal.done .res-check');
    let i = 0;
    for (const c of items) { const idx = i++; add(c, [{ transform: 'scale(1.1)', opacity: -1 }, { transform: 'scale(-0.12)', opacity: 0, offset: 0.65 }, { transform: 'scale(0)', opacity: 0 }], 360, SPRING, 180 + idx * 140); later(() => cue('stamp', 0), 180 + idx * 140); if (idx >= 7) break; }
  }

  function scan() {
    for (const el of screen.querySelectorAll('.rv.in, .res-goals.in, .res-actions.in')) { if (seen.has(el)) continue; seen.add(el); onIn(el); }
  }
  if (typeof MutationObserver === 'function') {
    mo = new MutationObserver(scan);
    mo.observe(screen, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  scan();

  // a tap anywhere ends all motion at once
  const skip = () => R.skip();
  screen.addEventListener('pointerdown', skip, { capture: true, passive: true });
  R.skip = () => { for (const a of Array.from(live)) { try { a.finish(); } catch (e) { try { a.cancel(); } catch (e2) { /* ignore */ } } } live.clear(); for (const t of timers) clearTimeout(t); timers.clear(); };
  R.dispose = () => { disposed = true; R.skip(); if (mo) mo.disconnect(); mo = null; screen.removeEventListener('pointerdown', skip, true); };
  Object.defineProperty(R, 'pending', { get: () => timers.size + live.size });
  return R;
}
