// motion/wiring.js: the director's ears. Listens to bus events and starts moments on the stage.
//   run:started, run:events (BIOME, RECORD, MILESTONE), run:ended (resets), and later meta:changed, achievement:unlocked, codex:new.
// Pure of the page: it gets the bus, the stage, a host finder and a biome name lookup.
import { PRIORITY } from './director.js';
import { makeBiomeCard } from '../../render/cinematics/biomeCard.js';
import { makeRecord, makeMilestone } from '../../render/cinematics/records.js';

export function wireDirector(opts) {
  const { bus, stage } = opts;
  const getHost = opts.getHost || (() => null);
  const biomeName = opts.biomeName || ((id) => id);
  const state = { seen: new Set(), recordDone: false };
  const offs = [];
  const on = (n, f) => { if (bus && typeof bus.on === 'function') offs.push(bus.on(n, f)); };

  on('run:started', () => { state.seen.clear(); state.recordDone = false; stage.director.skipGroup('hud'); });
  on('run:ended', () => { state.seen.clear(); });

  on('run:events', (p) => {
    const evs = p && Array.isArray(p.events) ? p.events : null;
    if (!evs || !evs.length) return;
    const host = getHost(); if (!host) return;
    // order matters: biome card and record first, the small milestone only if nothing else is playing
    const rank = { BIOME: 0, RECORD: 1, MILESTONE: 2 };
    const list = evs.filter((e) => e && rank[e.t] != null).sort((a, b) => rank[a.t] - rank[b.t]);
    for (const e of list) {
      if (e.t === 'BIOME') {
        const id = String(e.id || '');
        if (!id || state.seen.has(id)) continue;
        state.seen.add(id);
        stage.playMoment(host, { id: 'biome:' + id, group: 'hud', priority: PRIORITY.reward, dedupeMs: 0, build: ({ host: hs }) => makeBiomeCard(hs, { id, name: biomeName(id) }) });
      } else if (e.t === 'RECORD') {
        if (state.recordDone) continue; state.recordDone = true;
        stage.playMoment(host, { id: 'record', group: 'hud', priority: PRIORITY.milestone, dedupeMs: 0, build: ({ layer, cue }) => makeRecord(layer(), { depth: e.depth, cue }) });
      } else if (e.t === 'MILESTONE') {
        stage.playMoment(host, { id: 'milestone', group: 'hud', priority: PRIORITY.small, dedupeMs: 300, skipIfBusy: true, build: ({ layer, cue }) => makeMilestone(layer(), { depth: e.depth, cue }) });
      }
    }
  });
  return { state, dispose() { offs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); } };
}
