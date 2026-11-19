// motion/director.js: plays moments from a priority queue so two big moments never overlap.
// Pure logic. The host (rAF loop) calls director.tick(dtMs). Bus wiring lives in wireDirector().
import { createRunner } from './timeline.js';

export const PRIORITY = { ambient: 0, small: 1, reward: 2, milestone: 3, results: 4, big: 5 };

// moment: { id, group?, priority, make() -> runner def, audio?, haptic?, dedupeMs? }
export function createDirector(opts) {
  const o = opts || {};
  let reduce = !!o.reduce, speed = 1;
  const queue = [];
  const recent = new Map(); // id -> last start time (director clock)
  let clock = 0, current = null, seq = 0, playedCount = 0;
  const hooks = { audio: o.audio || (() => {}), haptic: o.haptic || (() => {}) };

  const d = {
    get current() { return current ? current.moment : null; },
    get pending() { return queue.length; },
    get played() { return playedCount; },
    setReduce(v) { reduce = !!v; if (current) current.runner.setReduce(reduce); },
    setSpeed(s) { speed = s > 0 ? s : 1; if (current) current.runner.setSpeed(speed); },
    // Returns false when ignored (duplicate within its window or bad moment).
    play(moment) {
      if (!moment || typeof moment.make !== 'function') return false;
      const win = moment.dedupeMs == null ? 600 : moment.dedupeMs;
      const last = recent.get(moment.id);
      if (last != null && clock - last < win) return false;
      if (current && current.moment.id === moment.id) return false;
      if (queue.some((q) => q.id === moment.id)) return false;
      recent.set(moment.id, clock);
      queue.push({ ...moment, priority: moment.priority || 0, _seq: seq++ });
      // a higher-priority arrival cuts a running lower-priority moment short (final state still applied)
      if (current && (moment.priority || 0) > (current.moment.priority || 0) + 1) current.runner.skip();
      advance();
      return true;
    },
    tick(dtMs) {
      clock += dtMs > 0 ? dtMs : 0;
      if (current) current.runner.tick(dtMs);
      advance();
    },
    // Skip the running moment and everything queued in its group (or the whole queue with no group).
    skipGroup(group) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (group == null || queue[i].group === group) { applyFinalOnly(queue[i]); queue.splice(i, 1); }
      }
      if (current && (group == null || current.moment.group === group)) current.runner.skip();
      advance();
    },
    skipAll() { d.skipGroup(null); },
    clear() { d.skipAll(); queue.length = 0; recent.clear(); },
    dispose() { d.clear(); current = null; },
  };

  function applyFinalOnly(m) {
    // A queued moment that is skipped before it starts still has to leave the right final state.
    try { const def = m.make(); if (def && typeof def.finish === 'function') def.finish(); } catch (e) { /* ignore */ }
  }

  function next() {
    if (!queue.length) return null;
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i], b = queue[best];
      if (a.priority > b.priority || (a.priority === b.priority && a._seq < b._seq)) best = i;
    }
    return queue.splice(best, 1)[0];
  }

  function advance() {
    while (!current) {
      const m = next();
      if (!m) return;
      let def = null;
      try { def = m.make(); } catch (e) { def = null; }
      if (!def) continue;
      const runner = createRunner(def, { reduce, speed });
      current = { moment: m, runner };
      if (!reduce) { try { hooks.audio(m.audio); } catch (e) { /* ignore */ } try { hooks.haptic(m.haptic); } catch (e) { /* ignore */ } }
      runner.start(() => { playedCount++; current = null; });
      // reduce-motion moments finish inside start(); loop to pick up the next one
    }
  }
  return d;
}
