// Encounters: surprises in the well. Warned 3 steps ahead, one at a time, never in the first 25 m.
// Randomness: one draw to pick the kind, a fixed number per kind to build its rows, one for the gap to the next one.
import { ENCOUNTER_RULES as R, ENCOUNTERS } from '../../data/events.js';
import { guardianBusy } from './guardianGate.js';
import { ev } from '../events.js';
import { rollRelic } from '../../data/relics.js';
import { biomeFor } from '../spawn.js';
import { money, bestTier, coveredLanes, newPlanRow } from './plan.js';

export function initEncounters(P, opts) {
  P.enc = { on: !!opts.encounters, next: P.rng.int(R.gapSteps[0], R.gapSteps[1]), active: null, lastHigh: -99, lastId: '', hits: 0, forced: opts.forceEncounter || '' };
}

export function endEncounter(run, success, out) {
  const P = run.play, E = P.enc, a = E.active;
  if (!a) return;
  if (out) out.push(ev.encounterEnd(a.id, !!success));
  P.stats.enc[a.id] = (P.stats.enc[a.id] || 0) + 1;
  if (success) P.stats.encWon[a.id] = (P.stats.encWon[a.id] || 0) + 1;
  E.active = null;
  E.lastId = a.id;
  E.next = run.state.beat + P.rng.int(R.gapSteps[0], R.gapSteps[1]);
}

function pickLanes(rng, cols, n) {
  const lanes = Array.from({ length: cols }, (_, i) => i);
  for (let i = 0; i < n; i++) { const j = i + rng.int(0, cols - 1 - i); const t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t; }
  return lanes.slice(0, n);
}

function build(run, id, startBeat) {
  const P = run.play, st = run.state, rng = P.rng, cols = run.cols;
  const def = biomeFor(run, st.depth + R.warnSteps * Math.max(1, st.speed));
  const bt = bestTier(def), E = ENCOUNTERS[id];
  const a = { id, name: E.name, warnBeat: st.beat, startBeat, endBeat: startBeat + 2, on: false, success: false, marked: 0, hits: 0 };
  if (id === 'gem_vein') {
    const tier = Math.max(E.minLevel, bt);
    for (let i = 0; i < E.rows; i++) {
      const pr = newPlanRow(cols, false);
      for (let l = 0; l < cols; l++) pr.cells[l] = { k: 'gem', tier, value: money(tier, def) };
      P.plan[startBeat + i] = pr;
    }
    a.endBeat = startBeat + E.rows;
  } else if (id === 'cave_in') {
    const hz = Object.keys(def.hazardWeights)[0] || 'rock';
    const per = Math.min(cols - 1, st.depth >= E.deepFrom ? E.hazardsPerRowDeep : E.hazardsPerRow);
    const hv = ((def.hazardStrain && def.hazardStrain[hz]) || 3) * E.strainFactor;
    const ot = Math.max(1, bt - 1);
    for (let i = 0; i < E.rows; i++) {
      const pr = newPlanRow(cols, true);
      const bad = pickLanes(rng, cols, per);
      for (let l = 0; l < cols; l++) {
        pr.cells[l] = bad.indexOf(l) >= 0 ? { k: 'hazard', tier: 1, hazard: hz, value: hv }
          : (E.oreInGaps ? { k: 'ore', tier: ot, value: money(ot, def, 0.5) } : null);
      }
      P.plan[startBeat + i] = pr;
    }
    a.endBeat = startBeat + E.rows + 1;
  } else if (id === 'treasure_alcove') {
    const cov = coveredLanes(run);
    const tier = Math.min(6, Math.max(E.level, bt));
    const rows = pickLanes(rng, E.rows, E.marks);
    for (let i = 0; i < E.rows; i++) P.plan[startBeat + i] = newPlanRow(cols, false);
    for (let m = 0; m < rows.length; m++) {
      const lane = cov[rng.int(0, cov.length - 1)];
      P.plan[startBeat + rows[m]].cells[lane] = { k: 'gem', tier, value: money(tier, def, 1.5), mark: true };
    }
    a.endBeat = startBeat + E.rows + 1;
  } else if (id === 'echo_chamber') {
    a.endBeat = startBeat + E.steps;
  } else if (id === 'rope_weevil') {
    a.endBeat = startBeat + E.steps;
    a.gnawn = 0;
  } else if (id === 'merchant') {
    a.endBeat = startBeat + 40; // closes when the offer is answered
  }
  return a;
}

function candidates(run) {
  const P = run.play, E = P.enc, st = run.state, frac = st.strain / Math.max(1, st.maxStrain);
  const list = [];
  const careful = frac >= R.mercyStrain || st.beat - E.lastHigh < R.mercyCooldown;
  for (const id of Object.keys(ENCOUNTERS)) {
    const c = ENCOUNTERS[id];
    if (st.depth < c.minDepth) continue;
    if (c.danger && careful) continue;
    if (id === 'merchant' && st.gold < c.minGold) continue;
    if (id === E.lastId && Object.keys(ENCOUNTERS).length > 1) continue;
    list.push([id, c.weight]);
  }
  return list;
}

function start(run, id, out) {
  const P = run.play, E = P.enc, st = run.state;
  const a = build(run, id, st.beat + R.warnSteps);
  E.active = a;
  out.push(ev.encounterWarn(id, a.name, ENCOUNTERS[id].warn, R.warnSteps));
}

// Called at the start of every step.
export function tickEncounters(run, out) {
  const P = run.play, E = P.enc, st = run.state;
  if (!E.on) return;
  if (st.strain / Math.max(1, st.maxStrain) >= R.mercyStrain) E.lastHigh = st.beat;
  const a = E.active;
  if (a) {
    if (st.beat === a.startBeat) {
      a.on = true;
      out.push(ev.encounterStart(a.id, a.name));
      if (a.id === 'echo_chamber') P.echoLeft = ENCOUNTERS.echo_chamber.steps;
      if (a.id === 'merchant') {
        if (st.gold >= ENCOUNTERS.merchant.minGold) P.wantOffer = 'merchant';
        else { endEncounter(run, false, out); return; }
      }
    }
    if (a.on && a.id === 'rope_weevil') {
      const W = ENCOUNTERS.rope_weevil, base = P.baseMax;
      const room = (st.maxStrain - st.strain) - W.floorPct * base;
      const allow = Math.min(W.gnawPct * base, W.maxGnawPct * base - P.gnaw, room);
      if (allow > 0) { P.gnaw += allow; P.recompute(run, true); }
    }
    if (a.id !== 'merchant' && st.beat >= a.endBeat) {
      let ok = a.success || a.id === 'gem_vein' || a.id === 'echo_chamber';
      if (a.id === 'cave_in') ok = a.hits <= 2;
      endEncounter(run, ok, out);
    }
    return;
  }
  if (st.beat < E.next) return;
  if (E.forced) { const f = E.forced; E.forced = ''; if (ENCOUNTERS[f]) { start(run, f, out); return; } }
  const gd = P.gd;
  if (st.depth < R.firstDepth || P.offer || P.wantOffer || guardianBusy(run, R.clearOfGuardian)) { E.next = st.beat + R.retrySteps; return; }
  const near = P.nextOfferDepth - st.depth;
  if (P.opts.boons && near >= 0 && near <= R.clearOfBoon * Math.max(1, st.speed)) { E.next = st.beat + R.retrySteps; return; }
  const list = candidates(run);
  if (!list.length) { E.next = st.beat + R.retrySteps; return; }
  start(run, P.rng.weighted(list), out);
}

// A marked gem was grabbed (treasure alcove).
export function onMarkGrabbed(run, out) {
  const P = run.play, a = P.enc && P.enc.active;
  if (!a || a.id !== 'treasure_alcove') return;
  a.marked++;
  if (a.marked === ENCOUNTERS.treasure_alcove.need) {
    a.success = true;
    const def = biomeFor(run, run.state.depth);
    const relic = rollRelic(P.rng, def.id, 0.15);
    P.relics.push(relic.id);
    out.push(ev.relicFound(relic.id, relic.name, relic.rarity, relic.biome, 'alcove'));
  }
}

export function onEncounterHazardHit(run) {
  const a = run.play.enc && run.play.enc.active;
  if (a && a.on && a.id === 'cave_in') a.hits++;
}
