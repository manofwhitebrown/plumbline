// Count-up numbers: smooth steps that always end exactly on the target.
export function easeOutCubic(t) {
  const x = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 1;
  return 1 - Math.pow(1 - x, 3);
}

export function countValue(from, to, t) {
  const a = Number.isFinite(from) ? from : 0;
  const b = Number.isFinite(to) ? to : 0;
  if (!(t < 1)) return b; // finished (or bad time): land exactly on target
  return a + (b - a) * easeOutCubic(t);
}

// A small counter state: call update(nowMs) each frame. No allocations per call.
export function createCounter(initial) {
  const s = { from: 0, to: 0, start: 0, dur: 0, value: 0 };
  s.value = s.from = s.to = Number.isFinite(initial) ? initial : 0;
  return {
    get value() { return s.value; },
    get done() { return s.value === s.to; },
    setTarget(to, nowMs, durMs, instant) {
      s.from = s.value;
      s.to = Number.isFinite(to) ? to : 0;
      s.start = Number.isFinite(nowMs) ? nowMs : 0;
      s.dur = instant ? 0 : Number.isFinite(durMs) ? Math.max(0, durMs) : 600;
      if (s.dur === 0) s.value = s.to;
    },
    update(nowMs) {
      if (s.value === s.to) return s.value;
      const t = s.dur > 0 ? (nowMs - s.start) / s.dur : 1;
      s.value = countValue(s.from, s.to, t);
      return s.value;
    },
  };
}
