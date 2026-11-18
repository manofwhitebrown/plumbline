// Turns engine events into visuals. Every CONTRACT event has a handler (see EVENT_NAMES).
// Outcome events (FIRE, CHAIN, COLLECT, MISS, HAZARD) play when the item reaches the bucket.
import { tileCx, tileCy, RISE_BEATS } from './layout.js';
import { tierColors, TOKENS, hazardColors } from './palette.js';
import { num, clamp } from './safe.js';
import { rand } from './rand.js';

export const T_FIRE = 1, T_CHAIN = 2;
const FIRE_RING = 'rgba(255,227,161,0.9)';

// fx = { sc, particles, floaters, camera, rope, bucket, well, vignette }
export function createEffects(fx) {
  const { sc, particles, floaters, camera, rope, bucket, well, vignette } = fx;
  let spawnBeat = 0;

  function flash(color, a, nowMs) { // limit flashes to 3 per second when reduce motion is on
    const f = sc.flashTimes;
    if (sc.reduceMotion) { let n = 0; for (let i = 0; i < 3; i++) if (nowMs - f[i] < 1000) n++; if (n >= 3) return; }
    f[0] = f[1]; f[1] = f[2]; f[2] = nowMs;
    sc.flashColor = color; sc.flashA = Math.max(sc.flashA, sc.reduceMotion ? a * 0.4 : a);
  }
  function ring(x, y, r1, color, life, follow) {
    const r = sc.rings.acquire(); r.x = x; r.y = y; r.r0 = 4; r.r1 = r1; r.color = color; r.life = life; r.max = life; r.w = 2.5; r.follow = !!follow;
  }
  function find(lane) { // newest rising item in this lane that belongs to this beat
    const it = sc.items.items; let best = null;
    for (let i = 0; i < it.length; i++) { const o = it[i]; if (o.alive && o.lane === lane && o.spawn === spawnBeat && o.out === 0) best = o; }
    return best;
  }
  function later(type, r, c, r2, c2) {
    const d = sc.due.acquire(); d.type = type; d.at = spawnBeat + RISE_BEATS; d.r = r; d.c = c; d.r2 = r2; d.c2 = c2;
  }

  const handlers = {
    RUN_START() { sc.reset(); particles.clear(); floaters.clear(); bucket.reset(); rope.reset(); camera.reset(); spawnBeat = 0; },
    BEAT(ev) {
      const i = num(ev.i, sc.beatCount + 1); sc.beatCount = Math.max(sc.beatCount, i); spawnBeat = sc.beatCount;
      sc.depthBase = num(ev.depth, sc.depthBase); sc.speed = clamp(num(ev.speed, sc.speed), -5, 10);
    },
    SPAWN(ev) {
      const i = num(ev.i, sc.beatCount); sc.beatCount = Math.max(sc.beatCount, i); spawnBeat = i;
      const lanes = Array.isArray(ev.lanes) ? ev.lanes : [], L = sc.L;
      for (let n = 0; n < lanes.length && n < L.cols; n++) {
        const it = lanes[n]; if (!it || it.kind === 'empty' || !it.kind) continue;
        const o = sc.items.acquire();
        o.kind = it.kind === 'ore' || it.kind === 'hazard' || it.kind === 'relic' ? it.kind : 'gem';
        o.tier = clamp(Math.floor(num(it.tier, 1)), 1, 6); o.hazard = it.hazard || null; o.lane = n; o.spawn = i; o.state = 0; o.out = 0; o.fade = 0;
        o.gold = 0; o.combo = 0; o.ar = -1; o.ac = -1; o.sd = 0; o.t = 0; o.seed = (i * 7 + n * 3) % 17;
      }
    },
    FIRE(ev) { later(T_FIRE, num(ev.r, -1), num(ev.c, -1), 0, 0); },
    CHAIN(ev) {
      const f = ev.from || {}, t = ev.to || {};
      later(T_CHAIN, num(f.r, -1), num(f.c, -1), num(t.r, -1), num(t.c, -1));
    },
    COLLECT(ev) {
      const o = find(num(ev.lane, -1));
      if (o) { o.out = 1; o.gold = num(ev.gold, 0); o.combo = num(ev.combo, 0); o.r = num(ev.r, 0); o.c = num(ev.c, 0); }
      else burst(ev); // item made by a part (e.g. Splitter): show it at the tile
    },
    MISS(ev) { const o = find(num(ev.lane, -1)); if (o) o.out = 2; },
    HAZARD(ev) {
      const o = find(num(ev.lane, -1)); if (!o) return;
      o.out = 3; o.sd = num(ev.strainDelta, 0);
      const a = ev.absorbedBy; if (a && Number.isFinite(a.r) && Number.isFinite(a.c)) { o.ar = a.r; o.ac = a.c; }
    },
    STRAIN(ev) {
      const max = num(ev.max, 100); sc.strain01 = max > 0 ? clamp(num(ev.value, 0) / max, 0, 1) : 0;
      vignette.setStrain(sc.strain01);
    },
    BIOME(ev) { sc.biomeId = ev.id || sc.biomeId; well.setBiome(ev.id, false); camera.pulse(0.012); },
    MILESTONE() { sc.milestoneT = 0; },
    SNAP() {
      if (sc.snapped) return; sc.snapped = true; rope.snap(); bucket.dip(28); bucket.startFall();
      if (!sc.reduceMotion) { sc.slowT = 600; sc.timeScale = 0.3; }
      camera.shake(6); flash('#ffffff', 0.55, sc.time);
      const L = sc.L; particles.burst(L.cx, L.attachY, 26, '#e0c890', 200, 1, 700, 3, 260); particles.burst(L.cx, L.attachY, 14, '#d9b26a', 160, 5, 900, 4, 120);
    },
    HAUL() {
      if (sc.hauled) return; sc.hauled = true; sc.haulT = 0; bucket.startLift();
      const L = sc.L; for (let i = 0; i < 22; i++) { const s = sc.streaks.acquire(); s.x = L.cx + (rand() - 0.5) * L.bucketW; s.y = L.top + rand() * L.bucketH; s.len = 16 + rand() * 26; s.v = 500 + rand() * 600; s.life = 500 + rand() * 300; }
      particles.burst(L.cx, L.top + L.bucketH / 2, 18, TOKENS.gold, 140, 2, 700, 2.4, -120);
    },
    RECORD() {
      const L = sc.L; ring(L.cx, L.top + L.bucketH / 2, Math.max(L.w, L.h) * 0.7, TOKENS.gold, 900, true);
      for (let i = 0; i < 34; i++) { const a = rand() * 6.2832, s = 120 + rand() * 260; particles.emit(2, L.cx, L.top + 40, Math.cos(a) * s, Math.sin(a) * s - 120, 1100, 2.5 + rand() * 2, rand() > 0.5 ? TOKENS.gold : TOKENS.goldSoft, 260, 1.2); }
      flash(TOKENS.goldSoft, 0.25, sc.time);
    },
  };

  function burst(ev) {
    const L = sc.L, r = num(ev.r, 0), c = num(ev.c, 0), x = tileCx(L, c), y = tileCy(L, r) + bucket.offY, tc = tierColors(ev.item && ev.item.tier);
    particles.burst(x, y, 8, tc.base, 110, 0, 420, 2.2, 200);
    text(ev, x, y - L.tile * 0.4);
  }
  function text(ev, x, y) {
    const g = num(ev.gold, 0), big = clamp(14 + Math.log10(1 + Math.max(0, g)) * 4, 14, 32);
    if (g > 0) floaters.add('+' + fmtShort(g), x, y, big, TOKENS.gold);
    if (num(ev.combo, 0) >= 3) floaters.add('x' + Math.floor(ev.combo) + ' combo', x, y - big - 8, 16, TOKENS.ember, 52, 900);
  }
  function fmtShort(n) { return n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n)); }

  // Called each frame: play everything whose beat has arrived, and move items.
  function arrive(o) {
    const L = sc.L, x = L.laneX[o.lane], y = L.arriveY;
    if (o.out === 1) { o.state = 1; o.t = 0; o.sx = x; o.sy = y; }
    else if (o.out === 3) {
      if (o.ar >= 0) { // blocked by a part
        const tx = tileCx(L, o.ac), ty = tileCy(L, o.ar) + bucket.offY; ring(tx, ty, L.tile * 0.8, TOKENS.shard, 380, false);
        particles.burst(tx, ty, 10, TOKENS.shard, 150, 0, 380, 2.4, 0); o.state = 2; o.t = 0;
      } else { // hit the rope
        const hc = hazardColors(o.hazard);
        particles.burst(x, y, 12, hc.light, 170, 0, 420, 2.6, 180); particles.burst(L.cx, L.attachY, 8, TOKENS.danger, 130, 0, 360, 2.4, 160);
        camera.shake(clamp(3 + o.sd * 0.4, 3, 6)); rope.doJolt(0.9); flash('#ff4d5e', 0.18, sc.time); bucket.dip(5); o.state = 2; o.t = 0;
      }
    } else { particles.burst(x, y, 4, '#8a8f9c', 40, 1, 520, 3, -20); o.state = 2; o.t = 0; }
  }
  function land(o) { // collect reached its tile
    const L = sc.L, tx = tileCx(L, o.c), ty = tileCy(L, o.r) + bucket.offY, tc = tierColors(o.tier);
    particles.burst(tx, ty, 9, tc.base, 120, 0, 420, 2.4, 200); particles.burst(tx, ty, 2, '#fff', 60, 2, 500, 2, 0);
    text(o, tx, ty - L.tile * 0.4); camera.nudge(0, 1.2);
  }

  return {
    handlers, arrive, land,
    handle(ev) { if (ev && typeof ev.t === 'string') { const h = handlers[ev.t]; if (h) h(ev); } },
    runDue() { // part flashes and chain threads
      const d = sc.due.items, L = sc.L;
      for (let i = 0; i < d.length; i++) {
        const e = d[i]; if (!e.alive || e.at > sc.beatPos) continue;
        if (e.type === T_FIRE && e.r >= 0 && e.c >= 0) { bucket.flash(e.r, e.c, L.cols); ring(tileCx(L, e.c), tileCy(L, e.r), L.tile * 0.7, FIRE_RING, 260, true); }
        else if (e.type === T_CHAIN && e.r >= 0 && e.c >= 0) { const th = sc.threads.acquire(); th.r = e.r; th.c = e.c; th.r2 = e.r2; th.c2 = e.c2; th.life = 120; }
        sc.due.release(e);
      }
    },
  };
}
export const EVENT_NAMES = ['RUN_START', 'BEAT', 'SPAWN', 'FIRE', 'CHAIN', 'COLLECT', 'MISS', 'HAZARD', 'STRAIN', 'BIOME', 'MILESTONE', 'SNAP', 'HAUL', 'RECORD'];
