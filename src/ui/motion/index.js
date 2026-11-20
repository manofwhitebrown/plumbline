// motion/index.js: installs MOTION-1 pieces into the UI. Importing this file is the only wiring needed.
import * as shell from '../shell.js';
import { getSettings } from '../settings.js';
import { setRunEndHook } from '../flow.js';
import { buzz, ui } from '../soft.js';
import './motion.css';
import { createTransitions } from './transitions.js';
import { createStage } from './stage.js';
import { wireDirector } from './wiring.js';
import { bus, dep } from '../soft.js';
import { api } from '../api.js';
import { installMicro } from './micro.js';
import { attachResults } from './results.js';
import { makeFlight } from '../../render/cinematics/rewards.js';

const isReduced = () => { try { return !!getSettings().reduceMotion; } catch (e) { return false; } };

export const transitions = createTransitions({ isReduced });
shell.setMotionHook({
  before: (root, from, to, back) => ({ inner: transitions.before(root, from, to, back), root, to }),
  after: (tok) => { transitions.after(tok.inner); try { onMounted(tok.to, tok.root); } catch (e) { /* decoration only */ } },
});

// Cues use only sounds and buzzes that already exist (audio.ui: tap, open, close, claim; haptics: tap, snap, record).
const CUES = {
  'drop:beat0': () => { ui('tap'); buzz('tap'); }, 'drop:beat1': () => { ui('tap'); buzz('tap'); }, 'drop:beat2': () => { ui('open'); buzz('tap'); },
  'drop:fall': () => ui('open'),
  'haul:haul': () => ui('claim'),
  'dailyChest:open': () => { ui('claim'); buzz('collect'); }, 'collapse:drained': () => buzz('record'),
  'results:tick': () => ui('tap'), 'results:stamp': () => ui('tap'),
  'record:record': () => buzz('record'), 'milestone:chime': () => ui('open'),
  'snap:snap': () => buzz('snap'), 'snap:thud': () => ui('close'),
};
export const stage = createStage({ isReduced, cue: (kind, k) => { const f = CUES[kind + ':' + k]; if (f) { try { f(); } catch (e) { /* ignore */ } } } });

// Drop screen hook: delay the run start until the cinematic ends. start() is always called exactly once.
export function beforeDrop(host, start, parts) {
  const run = (() => { let n = 0; return () => { if (!n++) start(); }; })();
  let took = false;
  try { took = stage.playBlocking(host, 'drop', { onGo: run, parts }); } catch (e) { took = false; }
  if (!took) run();
}

// Run-end hook: play haul or snap, then show Results. Returns true when it took over (flow.js then waits for goFn).
export function beforeResults(payload, goFn) {
  const host = typeof document !== 'undefined' ? document.querySelector('.screen-drop') : null;
  if (!host || shell.currentId() !== 'drop') return false;
  const kind = payload && payload.outcome === 'snapped' ? 'snap' : 'haul';
  try { return stage.playBlocking(host, kind, { onGo: goFn }); } catch (e) { return false; }
}
setRunEndHook(beforeResults);

const appEl = () => (typeof document !== 'undefined' ? document.getElementById('app') : null);
const centerOf = (sel) => {
  try {
    const e = document.querySelector(sel), a = appEl(); if (!e || !a) return null;
    const r = e.getBoundingClientRect(), b = a.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
  } catch (e) { return null; }
};
const nameOf = (list, id) => { try { const x = (list() || []).find((i) => i && i.id === id); return (x && (x.name || x.title)) || null; } catch (e) { return null; } };

// Bus wiring for in-run moments and rewards (biome cards, new record, 50 m markers, achievements, codex, Collapse, daily chest, first part).
export const wiring = wireDirector({
  bus, stage,
  getHost: () => (typeof document !== 'undefined' && shell.currentId() === 'drop' ? document.querySelector('.screen-drop') : null),
  getOverlayHost: appEl,
  biomeName: (id) => { try { const b = dep('biomes'); const d = b && b.byId ? b.byId(id) : null; return (d && d.name) || id; } catch (e) { return id; } },
  info: {
    achievement: (id) => nameOf(() => api.achievements.list(), id),
    codex: (id) => nameOf(() => api.codex.list(), id),
    targets: () => ({ gold: centerOf('[data-tut="gold"], .pill.gold'), shards: centerOf('[data-tut="shards"], .pill.shards'), coreDust: centerOf('[data-tut="coredust"], .pill.coredust') }),
    bannerTop: () => (shell.currentId() === 'drop' ? 96 : 12), // never cover the Drop HUD
    ownedParts: () => api.ownedParts(),
    partIcon: (id) => api.partIcon(id, 96),
    dailyState: () => api.daily.state(),
  },
});

// Per-screen touches after a screen is mounted: micro-interactions, results choreography.
let microInst = null; // created on first use, once #app exists
export const micro = { placeIndicator: () => getMicro().placeIndicator(), staggerIn: (r) => getMicro().staggerIn(r), get inst() { return microInst; } };
function getMicro() { return microInst || (microInst = installMicro({ isReduced, root: appEl() })); }
let resultsFx = null;
function onMounted(id, root) {
  if (resultsFx) { resultsFx.dispose(); resultsFx = null; }
  micro.placeIndicator(); micro.staggerIn(root);
  if (id === 'results') {
    const screen = root && root.querySelector ? root.querySelector('.screen-results') : null;
    resultsFx = attachResults(screen, {
      isReduced, cue: (k, pitch) => { const f = CUES['results:' + k]; if (f) { try { f(pitch); } catch (e) { /* ignore */ } } },
      fly: (kind, row) => {
        const app = appEl(), gold = document.querySelector('.res-gold'); if (!app || !gold || !row) return;
        const a = app.getBoundingClientRect(), g = gold.getBoundingClientRect(), r = row.getBoundingClientRect();
        stage.playMoment(app, { id: 'flight:' + kind, group: 'hud', priority: PRIORITY.small, dedupeMs: 0, build: ({ layer }) => makeFlight(layer(), { count: 7, from: { x: g.left - a.left + g.width / 2, y: g.top - a.top + g.height / 2 }, to: { x: r.left - a.left + 28, y: r.top - a.top + r.height / 2 } }) });
      },
    });
  }
}
