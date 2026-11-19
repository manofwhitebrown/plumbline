// motion/wiring.js: the director's ears. Listens to bus events and starts moments on the stage.
//   run:started, run:events (BIOME, RECORD, MILESTONE), run:ended (resets), and later meta:changed, achievement:unlocked, codex:new.
// Pure of the page: it gets the bus, the stage, a host finder and a biome name lookup.
import { PRIORITY } from './director.js';
import { makeBiomeCard } from '../../render/cinematics/biomeCard.js';
import { makeRecord, makeMilestone } from '../../render/cinematics/records.js';
import { makeDailyChest, makeCollapse, makeAchievement, makeCodexFlip, makePartDrop } from '../../render/cinematics/rewards.js';

export function wireDirector(opts) {
  const { bus, stage } = opts;
  const getHost = opts.getHost || (() => null);
  const biomeName = opts.biomeName || ((id) => id);
  const getOverlay = opts.getOverlayHost || (() => null); // a host that sits over every screen (the app root)
  const info = opts.info || {}; // optional lookups: achievement(id), codex(id), targets(), ownedParts(), partIcon(id), dailyState()
  const state = { seen: new Set(), recordDone: false, streak: null };
  const safe = (f, ...a) => { try { return typeof f === 'function' ? f(...a) : undefined; } catch (e) { return undefined; } };
  const reward = (id, build, priority) => { const host = getOverlay(); return host ? stage.playMoment(host, { id, group: 'reward', priority: priority == null ? PRIORITY.reward : priority, dedupeMs: 400, build }) : false; };
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
  on('achievement:unlocked', (p) => {
    const id = p && p.id; if (id == null) return;
    reward('achievement:' + id, ({ host }) => makeAchievement(host, { title: safe(info.achievement, id) || 'New achievement' }));
  });
  on('codex:new', (p) => {
    const id = p && p.id; if (id == null) return;
    reward('codex:' + id, ({ host }) => makeCodexFlip(host, { name: safe(info.codex, id) || 'New entry' }));
  });
  on('meta:collapsed', (p) => {
    if (!p || !(p.coreDustGain > 0)) return; // the cheat path sends 0: no ceremony
    reward('collapse', ({ layer, cue }) => makeCollapse(layer(), { cue, target: (safe(info.targets) || {}).coreDust }), PRIORITY.milestone);
  });
  on('meta:changed', (p) => {
    const what = p && p.what;
    const d = safe(info.dailyState);
    if (d && typeof d.streak === 'number') {
      if (what === 'daily' && state.streak != null && d.streak !== state.streak && d.canClaim === false) {
        reward('dailyChest', ({ layer, cue }) => makeDailyChest(layer(), { cue, targets: safe(info.targets) }));
      }
      state.streak = d.streak;
    }
    if (what === 'parts') {
      const owned = safe(info.ownedParts);
      if (Array.isArray(owned) && owned.length === 2) { // exactly one bought on top of the starting hook: the first purchase
        const id = owned.find((x) => x !== 'hook') || owned[1];
        reward('partDrop', ({ host }) => makePartDrop(host, { src: safe(info.partIcon, id), x: 0.5, y: 0.42 }));
      }
    }
  });
  return { state, dispose() { offs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); } };
}
