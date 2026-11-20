// Builds the plain `view` object the HUD reads each beat. Pure: pass in what it needs.
import { byId, abyssLevel, nextBiomeIn } from '../data/biomes.js';

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// 0 calm, 1 careful, 2 danger, 3 about to snap
export function dangerLevel(strain01) {
  if (strain01 >= 0.9) return 3;
  if (strain01 >= 0.75) return 2;
  if (strain01 >= 0.5) return 1;
  return 0;
}

export function idleView(bestDepth = 0) {
  return buildView(null, { bestDepth });
}

// run = engine run (or null). ctx = { goals, bestDepth, riskInfo, status }
export function buildView(run, ctx = {}) {
  const s = (run && run.state) || {};
  const depth = Math.max(0, num(s.depth));
  const maxStrain = Math.max(1, num(s.maxStrain, 100));
  const strain = Math.max(0, num(s.strain));
  const strain01 = Math.min(1, strain / maxStrain);
  const biome = byId(s.biomeId || 'clay', abyssLevel(depth));

  let risk = { beatsToSnap: 9999, goldAtRisk: 0, keepIfSnap: 0 };
  if (run && typeof ctx.riskInfo === 'function' && s.status === 'running') {
    try {
      const r = ctx.riskInfo(run) || {};
      risk = {
        beatsToSnap: Math.min(9999, Math.max(0, num(r.beatsToSnap, 9999))),
        goldAtRisk: Math.max(0, num(r.goldAtRisk)),
        keepIfSnap: Math.max(0, num(r.keepIfSnap)),
      };
    } catch (e) { /* keep the safe default */ }
  } else if (run) {
    risk = { beatsToSnap: 9999, goldAtRisk: 0, keepIfSnap: 0 };
  }

  let play = null;
  if (run && run.play && typeof ctx.playView === 'function') { try { play = ctx.playView(run); } catch (e) { play = null; } } // [HOOK-1]
  let chase = null; // [HOOK-1] wave 2: pills for the HUD
  if (run && typeof ctx.chase === 'function') { try { chase = ctx.chase({ depth, gold: Math.max(0, num(s.gold)), bestDepth: Math.max(0, num(ctx.bestDepth)), nextBiomeIn: Math.ceil(nextBiomeIn(depth)) }); } catch (e) { chase = null; } }
  return {
    play, chase,
    status: ctx.status || s.status || 'idle',
    depth, gold: Math.max(0, num(s.gold)),
    strain, maxStrain, strain01,
    biomeId: biome.id,
    biome: { id: biome.id, name: biome.name, palette: biome.palette, ambience: biome.ambience },
    combo: Math.max(0, Math.floor(num(s.combo))),
    speed: num(s.speed, 1),
    beat: Math.max(0, Math.floor(num(s.beat))),
    risk,
    dangerLevel: dangerLevel(strain01),
    goals: Array.isArray(ctx.goals) ? ctx.goals : [],
    bestDepth: Math.max(0, num(ctx.bestDepth)),
    nextBiomeIn: Math.ceil(nextBiomeIn(depth)),
  };
}

export default { buildView, idleView, dangerLevel };
