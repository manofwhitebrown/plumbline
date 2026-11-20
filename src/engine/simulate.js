// Headless runs for bots, balance tests and debugging. No events are built unless asked.
import { ENGINE } from '../data/engine.js';
import { createRun, riskInfo, haul } from './run.js';
import { runBeat } from './beat.js';
import { ev } from './events.js';
import { autoChoose, autoSkills } from './play/api.js'; // [HOOK-1]

// policy({ run, riskInfo }) -> 'continue' | 'haul'. Default: never haul.
// play: pass an options object to switch the play layer on (boons, skills, encounters, guardians). Offers are auto-picked,
// and skills are pressed by a simple helper unless `skills: false`.
export function simulateRun({ rig, mods, seed, policy, deps, withEvents = false, maxBeats, play, skills } = {}) {
  const run = createRun({ rig, mods, seed, deps, play });
  const log = withEvents ? [ev.runStart(run.seed)] : null;
  const arg = { run, riskInfo: { beatsToSnap: 999, goldAtRisk: 0, keepIfSnap: 0 } };
  const cap = Math.min(ENGINE.maxBeats, maxBeats > 0 ? maxBeats : ENGINE.maxBeats);
  const st = run.state;
  let guard = 0;
  while ((st.status === 'running' || st.status === 'choosing') && guard++ < ENGINE.maxBeats * 4) {
    if (st.status === 'choosing') { const e = autoChoose(run); if (log) log.push(...e); if (st.status === 'choosing') st.status = 'running'; continue; }
    if (run.play && skills !== false) { const e = autoSkills(run); if (log && e.length) log.push(...e); }
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
