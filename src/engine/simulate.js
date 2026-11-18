// Headless runs for bots, balance tests and debugging. No events are built unless asked.
import { ENGINE } from '../data/engine.js';
import { createRun, riskInfo, haul } from './run.js';
import { runBeat } from './beat.js';
import { ev } from './events.js';

// policy({ run, riskInfo }) -> 'continue' | 'haul'. Default: never haul.
export function simulateRun({ rig, mods, seed, policy, deps, withEvents = false, maxBeats } = {}) {
  const run = createRun({ rig, mods, seed, deps });
  const log = withEvents ? [ev.runStart(run.seed)] : null;
  const arg = { run, riskInfo: { beatsToSnap: 999, goldAtRisk: 0, keepIfSnap: 0 } };
  const cap = Math.min(ENGINE.maxBeats, maxBeats > 0 ? maxBeats : ENGINE.maxBeats);
  const st = run.state;
  while (st.status === 'running') {
    if (st.beat >= cap) { const h = haul(run); if (log) log.push(...h); break; }
    if (typeof policy === 'function') {
      riskInfo(run, arg.riskInfo);
      let choice = 'continue';
      try { choice = policy(arg); } catch (e) { choice = 'continue'; }
      if (choice === 'haul') { const h = haul(run); if (log) log.push(...h); break; }
    }
    try { runBeat(run, log); } catch (e) { run.out = null; st.status = 'hauled'; st.kept = Math.floor(st.gold); }
  }
  const r = { outcome: st.status, beats: st.beat, depth: st.depth, gold: Math.floor(st.gold), kept: st.kept,
    lost: Math.floor(st.gold) - st.kept, strain: st.strain, biomeId: st.biomeId, stats: st.stats, state: st };
  if (log) r.events = log;
  return r;
}

// One line of text per event, so people can read a whole run.
export function replayText(opts) {
  const res = simulateRun({ ...opts, withEvents: true });
  return res.events.map(describe).join('\n');
}

function describe(e) {
  switch (e.t) {
    case 'RUN_START': return 'start seed ' + e.seed;
    case 'BEAT': return '-- beat ' + e.i + ' depth ' + e.depth.toFixed(1) + ' speed ' + e.speed;
    case 'SPAWN': return '  rises: ' + e.lanes.map((l) => l.kind === 'empty' ? '.' : l.kind[0] + l.tier + (l.hazard ? ':' + l.hazard : '')).join(' ');
    case 'FIRE': return '  fire ' + e.partId + ' at ' + e.r + ',' + e.c;
    case 'CHAIN': return '  chain ' + e.from.r + ',' + e.from.c + ' -> ' + e.to.r + ',' + e.to.c;
    case 'COLLECT': return '  collect lane ' + e.lane + ' ' + e.item.kind + ' t' + e.item.tier + ' +' + e.gold + ' combo ' + e.combo;
    case 'MISS': return '  miss lane ' + e.lane + ' ' + e.item.kind;
    case 'HAZARD': return '  hazard ' + e.hazard + ' lane ' + e.lane + (e.absorbedBy ? ' absorbed' : ' strain +' + e.strainDelta);
    case 'STRAIN': return '  strain ' + e.value.toFixed(1) + '/' + e.max + ' (' + (e.delta >= 0 ? '+' : '') + e.delta.toFixed(2) + ')';
    default: return '  ' + e.t + ' ' + JSON.stringify(e);
  }
}
