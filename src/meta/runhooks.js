// Listens to the run events and updates stats, quests, codex and best Depth.
// It does NOT pay Gold or Shards for a run. The run session (AI-4) pays those through meta.addGold / meta.addShards.
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { s, changed } from './state.js';
import { bump, top } from './stats.js';
import { record } from './codex.js';
import { check } from './achievements.js';
import { detectCombos } from './partsApi.js';
import { num } from './safe.js';

let started = false;

// One beat's worth of events.
export function onEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return;
  let gems = 0, ore = 0, relics = 0, chains = 0, blocked = 0, combo = 0;
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    if (e.t === 'COLLECT' && e.item) {
      if (e.item.kind === 'gem') gems++;
      else if (e.item.kind === 'ore') ore++;
      else if (e.item.kind === 'relic') {
        relics++;
        const tier = Math.min(6, Math.max(1, Math.floor(num(e.item.tier, 1))));
        record(`relic:t${tier}`);
      }
      combo = Math.max(combo, num(e.combo));
    } else if (e.t === 'CHAIN') chains++;
    else if (e.t === 'HAZARD' && e.absorbedBy) blocked++;
    else if (e.t === 'BIOME' && typeof e.id === 'string') record(`biome:${e.id}`);
  }
  if (gems) bump('gems', gems);
  if (ore) bump('ore', ore);
  if (relics) bump('relics', relics);
  if (chains) bump('chains', chains);
  if (blocked) bump('blocked', blocked);
  if (combo) top('maxCombo', combo, 'combo');
}

// Record combos found in a rig (called with the rig when a run starts).
export function onRig(rig) {
  if (!rig || typeof rig !== 'object') return;
  for (const c of detectCombos(rig)) record(`combo:${c.id}`);
}

export function onRunEnded(p) {
  if (!p || typeof p !== 'object') return;
  const st = s();
  bump('drops', 1);
  if (p.outcome === 'hauled') bump('hauls', 1);
  else if (p.outcome === 'snapped') bump('snaps', 1);
  const depth = num(p.depth);
  top('maxDepthRun', depth, 'depth');
  if (!st.cheated && depth > st.bestDepth) st.bestDepth = Math.min(1e9, Math.floor(depth));
  const used = Array.isArray(p.partsUsed) ? p.partsUsed : p.partsUsed && typeof p.partsUsed === 'object' ? Object.keys(p.partsUsed) : [];
  for (const id of used) if (typeof id === 'string') record(`part:${id}`);
  if (p.rig) onRig(p.rig);
  changed('run');
  check();
}

// Safe to call many times.
export function start() {
  if (started) return;
  started = true;
  const guard = (fn) => (payload) => { try { fn(payload); } catch (e) { log.error('meta hook failed', e && e.message); } };
  bus.on('run:started', guard((p) => { if (p && p.rig) onRig(p.rig); }));
  bus.on('run:events', guard((p) => onEvents(p && p.events)));
  bus.on('run:ended', guard(onRunEnded));
}
