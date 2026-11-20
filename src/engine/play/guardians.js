// Guardians: big fights at 250, 500, 750 and 1000 m (then every 500 m in the abyss).
// Randomness: a fixed number of draws when the fight is built (pattern start, weak points), none while it runs.
import { GUARDIAN_RULES as R, GUARDIANS, guardianAt, ABYSS_GUARDIAN_EVERY } from '../../data/bosses.js';
import { ev } from '../events.js';
import { rollRelic } from '../../data/relics.js';
import { biomeFor } from '../spawn.js';
import { money, coveredLanes, newPlanRow } from './plan.js';

const LAST_FIXED = GUARDIANS[GUARDIANS.length - 1].depth;

// The first guardian mark at or after `depth`.
export function nextMark(depth) {
  for (const g of GUARDIANS) if (g.depth >= depth) return g.depth;
  const k = Math.max(1, Math.ceil((depth - LAST_FIXED) / ABYSS_GUARDIAN_EVERY));
  return LAST_FIXED + k * ABYSS_GUARDIAN_EVERY;
}

export function initGuardians(P, opts, run) {
  P.gd = { on: !!opts.guardians, mark: nextMark(run.state.depth), active: null, forced: opts.forceGuardian || '', beaten: [] };
}

// ---- patterns: lists of danger lanes for each step of the fight ----
function bounce(t, cols) { const p = 2 * (cols - 1) || 1; const m = ((t % p) + p) % p; return m < cols ? m : p - m; }

function patternRows(def, cols, rng) {
  const rows = [];
  const n = def.steps;
  if (def.pattern === 'wall') {
    const gw = Math.min(def.gapWidth, cols - 1);
    const maxG = cols - gw;
    let g = rng.int(0, maxG), dir = rng.chance(0.5) ? 1 : -1;
    for (let s = 0; s < n; s++) {
      if (s % def.wallEvery !== def.wallEvery - 1) { rows.push([]); continue; }
      const lanes = [];
      for (let l = 0; l < cols; l++) if (l < g || l >= g + gw) lanes.push(l);
      rows.push(lanes);
      if (g + dir < 0 || g + dir > maxG) dir = -dir;
      g += dir;
    }
  } else if (def.pattern === 'web') {
    const off = rng.int(0, cols - 1);
    for (let s = 0; s < n; s++) {
      if (s % 2 !== 0) { rows.push([]); continue; }
      const p = bounce(s / 2 + off, cols), q = cols - 1 - p;
      rows.push(p === q ? [p] : [p, q].sort((a, b) => a - b));
    }
  } else if (def.pattern === 'jaws') {
    for (let s = 0; s < n; s++) {
      const k = s % 4;
      if (k === 0) rows.push(cols > 1 ? [0, cols - 1] : [0]);
      else if (k === 2) rows.push(cols > 3 ? [1, cols - 2] : [1]);
      else rows.push([]);
    }
  } else { // orbit
    const off = rng.int(0, cols - 1);
    for (let s = 0; s < n; s++) {
      const a = (Math.floor(s / 2) + off) % cols;
      if (s % 4 === 0) rows.push([a, (a + 2) % cols].filter((v, i, arr) => arr.indexOf(v) === i).sort((x, y) => x - y));
      else if (s % 4 === 2) rows.push([a]);
      else rows.push(rng.chance(0.3) ? [rng.int(0, cols - 1)] : []);
    }
  }
  return rows;
}

function schedule(run, def, out) {
  const P = run.play, G = P.gd, st = run.state, rng = P.rng, cols = run.cols;
  const startBeat = st.beat + R.warnSteps;
  const biome = biomeFor(run, st.depth + R.warnSteps);
  const idx = Math.max(0, GUARDIANS.findIndex((g) => g.id === def.id));
  const rows = patternRows(def, cols, rng);
  const cov = coveredLanes(run);
  const nWeak = cov.length >= 2 ? 2 : 1;
  const wtier = Math.min(6, 3 + idx);
  const hv = def.hazardPct * st.maxStrain;
  for (let s = 0; s < def.steps; s++) {
    const pr = newPlanRow(cols, true);
    pr.noClear = true; P.noClear[startBeat + s] = true;
    for (const l of rows[s]) pr.cells[l] = { k: 'hazard', tier: 1, hazard: def.hazard, value: hv };
    if (s % R.weakEvery === 1) {
      const free = cov.filter((l) => rows[s].indexOf(l) < 0);
      const from = free.length ? free : cov.slice();
      for (let w = 0; w < Math.min(nWeak, from.length); w++) {
        const j = rng.int(0, from.length - 1);
        const lane = from.splice(j, 1)[0];
        pr.cells[lane] = { k: 'gem', tier: wtier, value: money(wtier, biome, 1), weak: true };
      }
    }
    P.plan[startBeat + s] = pr;
  }
  const maxHp = def.hp;
  G.active = { def, id: def.id, name: def.name, warnBeat: st.beat, startBeat, endBeat: startBeat + def.steps, on: false,
    hp: maxHp, maxHp, hits: 0, damage: 0, covered: cov.length, mark: G.mark };
  out.push(ev.guardianWarn(def.id, def.name, R.warnSteps, def.depth, def.intro));
}

// Called at the start of each step.
export function tickGuardian(run, out) {
  const P = run.play, G = P.gd, st = run.state;
  if (!G.on) return;
  const a = G.active;
  if (a) {
    if (st.beat === a.startBeat) {
      a.on = true;
      out.push(ev.guardianStart(a.id, a.name, a.hp, a.maxHp, a.def.steps, a.def.tip));
      P.stats.gd[a.id] = P.stats.gd[a.id] || { met: 0, won: 0 };
      P.stats.gd[a.id].met++;
    }
    if (a.on && st.beat < a.endBeat) run.strainAdjust += a.def.strainPerStep * st.maxStrain;
    return;
  }
  if (G.forced) {
    const f = GUARDIANS.find((g) => g.id === G.forced);
    G.forced = '';
    if (f && st.beat >= 2) { schedule(run, f, out); return; }
  }
  const reach = st.depth + R.warnSteps * Math.max(1, st.speed);
  if (st.depth > G.mark + 0.001 && !G.active) { G.mark = nextMark(st.depth + 1); return; } // passed (e.g. a deep start)
  if (reach >= G.mark - 1e-9 && !P.offer) {
    const def = guardianAt(G.mark);
    if (def) schedule(run, def, out);
  }
}

export function guardianActive(run) {
  const a = run.play.gd && run.play.gd.active;
  return !!(a && a.on && run.state.beat < a.endBeat);
}

// A weak point or other gem was grabbed during the fight.
export function onGuardianGrab(run, rec, chains, out) {
  const P = run.play, a = P.gd && P.gd.active;
  if (!a || !a.on) return;
  const item = rec.item;
  let dmg = 0;
  if (item.weak) {
    dmg = a.def.weakDmg * (1 + R.chainBonus * Math.min(R.chainCap, chains)) * (1 + R.reachBonus * Math.max(0, a.covered - 1));
  } else if (item.kind === 'gem' || item.kind === 'ore') {
    dmg = R.chip;
  } else return;
  dmg = Math.round(dmg * 10) / 10;
  a.hp = Math.max(0, a.hp - dmg);
  a.damage += dmg;
  if (item.weak) a.hits++;
  out.push(ev.guardianHit(a.id, dmg, a.hp, a.maxHp, rec.lane, !!item.weak));
}

function clearRows(run, fromBeat) {
  const P = run.play;
  for (const k of Object.keys(P.plan)) if (Number(k) > fromBeat) delete P.plan[k];
}

// After the step's gold is paid: did the fight end?
export function resolveGuardian(run, out) {
  const P = run.play, G = P.gd, st = run.state, a = G.active;
  if (!G.on || !a || !a.on) return;
  const won = a.hp <= 0;
  if (!won && st.beat < a.endBeat - 1) return;
  const def = a.def;
  clearRows(run, st.beat);
  const reward = { shards: def.reward.shards, coreDust: def.reward.coreDust };
  out.push(ev.guardianDown(a.id, a.name, won, won ? reward : null, Math.round(a.damage)));
  if (won) {
    P.stats.gd[a.id].won++;
    G.beaten.push(a.id);
    const biome = biomeFor(run, st.depth);
    const relic = rollRelic(P.rng, biome.id, def.reward.relicBias);
    P.relics.push(relic.id);
    out.push(ev.relicFound(relic.id, relic.name, relic.rarity, relic.biome, 'guardian'));
    P.shardsWon += def.reward.shards;
    P.wantOffer = 'guardian';
  }
  G.mark = nextMark(Math.max(st.depth, a.mark) + 1);
  G.active = null;
}
