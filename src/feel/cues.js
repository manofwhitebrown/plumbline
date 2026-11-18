// feel/cues.js: turns the HUD view and engine events into smooth, bounded "feel" values.
// Pure logic, no DOM, no timers. Frame-rate independent. All outputs are finite and bounded for any input.
//
// API:
//   const cues = createCues({ reduceMotion })
//   cues.setReduceMotion(bool)
//   cues.push(event)                 // engine events: RUN_START, COLLECT, HAZARD, MILESTONE, SNAP, HAUL (others ignored)
//   cues.update(dtMs, view)          // view: { strain, maxStrain, depth, combo, status } (anything missing is fine)
//   cues.reset()
// Read these fields after update() (numbers, no allocation):
//   tension        0..1   smoothed rope tension (follows strain with no jumps)
//   anticipation   0..1   builds only in the last 10 percent of strain
//   danger         0..1   smooth danger glow level (starts near 60 percent strain)
//   heartbeatHz    0..3   0 when calm; 1..3 beats per second near a Snap
//   heartbeat      0..1   the pulse shape for this frame (sharp double thump), 0 when calm
//   camX, camY     -3..3  camera nudge in px (impulse that decays, 0 with Reduce motion)
//   zoom           1..1.03 zoom pulse scale (0 with Reduce motion)
//   comboGlow      0..1   combo glow level (full at combo 20)
//   hitStopMs      0..80  remaining hit-stop; timeScale is 0.05 while it runs, else 1
//   timeScale      0.05..1
export { clamp, clamp01, smoothstep } from './spring.js';
import { createSpring, clamp, clamp01, smoothstep, fin } from './spring.js';

export const LIMITS = { nudgePx: 3, zoomMax: 0.03, hitStopMax: 80, hitStopGapMs: 400, zoomGapMs: 500, comboFull: 20, bigTier: 4 };

export function createCues(opts) {
  let reduce = !!(opts && opts.reduceMotion);
  const tensionS = createSpring(0, 180), antS = createSpring(0, 220), dangerS = createSpring(0, 260), comboS = createSpring(0, 300);
  const nx = createSpring(0, 90), ny = createSpring(0, 90), zoomS = createSpring(0, 120);
  let sinceHit = 9999, sinceZoom = 9999, phase = 0;

  const c = {
    tension: 0, anticipation: 0, danger: 0, heartbeatHz: 0, heartbeat: 0, camX: 0, camY: 0, zoom: 1, comboGlow: 0, hitStopMs: 0, timeScale: 1,
    setReduceMotion(v) { reduce = !!v; if (reduce) { nx.snap(0); ny.snap(0); zoomS.snap(0); c.hitStopMs = 0; } },
    reset() {
      for (const s of [tensionS, antS, dangerS, comboS, nx, ny, zoomS]) { s.snap(0); s.vel = 0; }
      sinceHit = sinceZoom = 9999; phase = 0; c.hitStopMs = 0; c.timeScale = 1;
      c.tension = c.anticipation = c.danger = c.heartbeatHz = c.heartbeat = c.camX = c.camY = c.comboGlow = 0; c.zoom = 1;
    },
    push(ev) {
      if (!ev || typeof ev !== 'object') return;
      switch (ev.t) {
        case 'RUN_START': c.reset(); break;
        case 'COLLECT': {
          const tier = ev.item && Number.isFinite(ev.item.tier) ? ev.item.tier : 0;
          if (tier >= LIMITS.bigTier && sinceHit >= LIMITS.hitStopGapMs && !reduce) { c.hitStopMs = 40 + 10 * clamp(tier - LIMITS.bigTier, 0, 4); sinceHit = 0; }
          if (tier >= LIMITS.bigTier) kickZoom(0.5);
          break;
        }
        case 'HAZARD': {
          const d = clamp(fin(ev.strainDelta), 0, 10);
          if (!reduce && d > 0) { const k = LIMITS.nudgePx * clamp(d / 5, 0.25, 1); nx.value += (ev.lane % 2 ? -1 : 1) * k; ny.value += k * 0.6; nx.value = clamp(nx.value, -3, 3); ny.value = clamp(ny.value, -3, 3); }
          break;
        }
        case 'MILESTONE': kickZoom(0.6); break;
        case 'SNAP': if (!reduce) { c.hitStopMs = LIMITS.hitStopMax; sinceHit = 0; ny.value = 3; } kickZoom(1); break;
        default: break;
      }
    },
    update(dtMs, view) {
      const dt = clamp(fin(dtMs), 0, 250);
      const v = view && typeof view === 'object' ? view : {};
      const max = fin(v.maxStrain, 100) > 0 ? fin(v.maxStrain, 100) : 100;
      const s01 = v.status === 'snapped' ? 1 : clamp01(fin(v.strain) / max);
      sinceHit = Math.min(9999, sinceHit + dt); sinceZoom = Math.min(9999, sinceZoom + dt);
      c.tension = clamp01(tensionS.update(s01, dt));
      c.anticipation = clamp01(antS.update(smoothstep(0.9, 1, s01), dt));
      c.danger = clamp01(dangerS.update(smoothstep(0.6, 1, s01), dt));
      c.comboGlow = clamp01(comboS.update(fin(v.combo) / LIMITS.comboFull, dt));
      // heartbeat: 1 to 3 per second, only in the last quarter, and not with Reduce motion
      const run = v.status === 'running' || v.status === undefined;
      const hz = !reduce && run ? 1 + 2 * smoothstep(0.75, 1, s01) : 0;
      c.heartbeatHz = s01 >= 0.75 && !reduce && run ? hz : 0;
      if (c.heartbeatHz > 0) {
        phase = (phase + (dt / 1000) * c.heartbeatHz) % 1;
        const a = Math.max(0, 1 - Math.abs(phase - 0.05) / 0.07), b = Math.max(0, 1 - Math.abs(phase - 0.22) / 0.09) * 0.6;
        c.heartbeat = clamp01(Math.max(a, b) * (0.5 + 0.5 * c.danger));
      } else { c.heartbeat = 0; phase = 0; }
      if (reduce) { c.camX = c.camY = 0; zoomS.snap(0); c.zoom = 1; c.hitStopMs = 0; c.timeScale = 1; return c; }
      c.camX = clamp(nx.update(0, dt), -LIMITS.nudgePx, LIMITS.nudgePx);
      c.camY = clamp(ny.update(0, dt), -LIMITS.nudgePx, LIMITS.nudgePx);
      c.zoom = 1 + clamp(zoomS.update(0, dt), 0, 1) * LIMITS.zoomMax;
      if (c.hitStopMs > 0) { c.hitStopMs = Math.max(0, c.hitStopMs - dt); }
      c.timeScale = c.hitStopMs > 0 ? 0.05 : 1;
      return c;
    },
  };
  function kickZoom(k) {
    if (reduce || sinceZoom < LIMITS.zoomGapMs) return;
    sinceZoom = 0; zoomS.value = clamp(Math.max(zoomS.value, k), 0, 1);
  }
  return c;
}
