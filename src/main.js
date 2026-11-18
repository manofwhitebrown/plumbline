// Game entry. Boot order (CONTRACT, mission Phase C):
//   log -> save -> module slices -> meta (offline income) -> audio on first tap -> ui shell -> home (or tutorial).
// Each step is wrapped, so one broken module is logged and skipped. The player never sees a blank page.
import { log } from './core/log.js';
import { bus } from './core/bus.js';
import * as save from './core/save.js';
import { now, elapsedSince } from './core/clock.js';
import { runSteps, callInit } from './core/boot.js';
import { installGlobalErrorHandlers, showFatal } from './core/errors.js';
import { wireSenses } from './core/wiring.js';
import { applyViewportVars, watchViewport } from './platform/viewport.js';
import { buzz, setHapticsEnabled } from './platform/haptics.js';
import { wireAudio, initOnFirstGesture } from './audio/wire.js';

// Style files from the UI folder (tokens, base, components). Whatever is there gets loaded.
import.meta.glob('./ui/styles/*.css', { eager: true });
// Modules that may not exist yet. A missing file gives an empty list, not an error.
const optional = import.meta.glob(['./meta/index.js', './cheats/index.js']);
const screenFiles = import.meta.glob('./ui/screens/*.js');

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const DEBUG = params.get('debug') === '1'; // debug entry points exist only with ?debug=1
const DEBUG_SCREENS = ['home', 'rig', 'drop', 'results', 'crew', 'workshop', 'codex', 'rewards', 'settings', 'guide'];
const ctx = { ui: null, audio: null, tutorial: null, run: null, meta: null, settings: null };

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  splash.classList.add('gone');
  setTimeout(() => splash.remove(), 300);
}

// Load a module that must exist, or one that may be missing (returns null).
async function soft(loader, name) {
  try { return await loader(); } catch (err) { log.warn(`module "${name}" did not load`, err); return null; }
}

// ---- boot steps ----

const steps = [
  { name: 'save', run: () => { save.initSave(); } },

  { name: 'slices', run: async () => {
    ctx.settings = await soft(() => import('./ui/settings.js'), 'settings');
    if (ctx.settings) await ctx.settings.initSettings();
    ctx.run = await soft(() => import('./run/index.js'), 'run');
    ctx.tutorial = await soft(() => import('./tutorial/index.js'), 'tutorial');
    await callInit(ctx.run, 'run');
    await callInit(ctx.tutorial, 'tutorial');
  } },

  { name: 'meta', run: async () => {
    const load = optional['./meta/index.js'];
    ctx.meta = load ? await soft(load, 'meta') : null;
    await callInit(ctx.meta, 'meta'); // meta works out offline income when it starts
    const cheats = optional['./cheats/index.js'];
    if (cheats) await callInit(await soft(cheats, 'cheats'), 'cheats');
    startMetaClock();
  } },

  // Debug only: ?fixture=empty|busy|extreme. The save is in memory, so the real game is never touched.
  { name: 'fixture', run: async () => {
    const name = DEBUG ? params.get('fixture') : null;
    if (!name) return;
    const { loadFixture } = await import('./cheats/fixtures.js');
    const r = loadFixture(name);
    if (!r.ok) log.warn('fixture not loaded: ' + r.error);
  } },

  // A drop that was cut off by closing the page is paid once, as a snap, before Home opens.
  { name: 'recover', run: async () => {
    const s = ctx.run && ctx.run.session;
    if (s && typeof s.recover === 'function') s.recover();
  } },

  { name: 'audio', run: async () => {
    const mod = await soft(() => import('./audio/index.js'), 'audio');
    ctx.audio = mod ? mod.audio : null;
    wireAudio();            // game events -> sound (audio/wire.js)
    initOnFirstGesture();   // browsers only allow sound after a tap or key press
    applySettingsToSenses();
    wireSenses({ bus, audio: ctx.audio, buzz });
  } },

  { name: 'ui', critical: true, run: async () => {
    ctx.ui = await import('./ui/index.js');
    ctx.ui.mountApp(document.getElementById('app'));
    // Screens add themselves when loaded.
    const loaded = await Promise.allSettled(Object.values(screenFiles).map((load) => load()));
    loaded.forEach((r, i) => { if (r.status === 'rejected') log.error(`screen "${Object.keys(screenFiles)[i]}" failed to load`, r.reason); });
  } },

  { name: 'home', critical: true, run: async () => {
    if (ctx.settings) ctx.settings.applySettings(document.documentElement);
    if (!ctx.ui.shell.go('home')) throw new Error('home screen did not open');
    hideSplash();
    const target = DEBUG ? params.get('screen') : null;
    if (target && target !== 'home') openDebugScreen(target);
    else if (!(DEBUG && (target || params.get('fixture')))) maybeStartTutorial();
  } }
];

// ---- helpers ----

function applySettingsToSenses() {
  if (!ctx.settings) return;
  const apply = (s) => {
    try {
      setHapticsEnabled(!!s.haptics);
      if (ctx.audio) { ctx.audio.mute(!s.sound); ctx.audio.setVolumes({ sfx: s.sfx, music: s.music }); }
      ctx.settings.applySettings(document.documentElement);
    } catch (err) { log.warn('could not apply settings', err); }
  };
  apply(ctx.settings.getSettings());
  ctx.settings.onSettings(apply);
}

// The surface crew earns gold while the game is open. meta.tick(dtMs) does the maths.
function startMetaClock() {
  if (!ctx.meta || !ctx.meta.meta || typeof ctx.meta.meta.tick !== 'function') return;
  let last = now();
  setInterval(() => {
    const t = now();
    const dt = Math.min(elapsedSince(last, 5000), 5000); // a long sleep is handled as offline income, not here
    last = t;
    if (document.hidden || dt <= 0) return;
    try { ctx.meta.meta.tick(dt); } catch (err) { log.error('meta tick failed', err); }
  }, 1000);
}

function maybeStartTutorial() {
  const t = ctx.tutorial && ctx.tutorial.tutorial;
  if (!t) return;
  try {
    const wanted = typeof t.shouldStart === 'function' ? t.shouldStart() : save.wasFresh();
    if (wanted) t.start();
  } catch (err) { log.warn('tutorial did not start', err); }
}

// Pause a running drop when the tab is hidden. The player resumes it on purpose.
function pauseDropWhenHidden() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    try {
      const s = ctx.run && ctx.run.session;
      if (s && s.getView().status === 'running') s.pause();
    } catch (err) { log.warn('could not pause on hide', err); }
  });
}

// Debug only: ?debug=1&screen=<id> opens any screen. Drop and Results get a safe fake drop.
function openDebugScreen(id) {
  try {
    if (!DEBUG_SCREENS.includes(id)) { log.warn('debug: unknown screen ' + id); return; }
    const big = params.get('fixture') === 'extreme';
    const session = ctx.run && ctx.run.session;
    let args;
    if (id === 'drop' && session) args = { debug: true, view: session.debugView({ extreme: big }) };
    else if (id === 'results' && session) args = { ...session.debugResults(params.get('outcome') === 'snapped' ? 'snapped' : 'hauled', { extreme: big }), debug: true };
    ctx.ui.shell.go(id, args);
  } catch (err) { log.warn('debug screen failed', err); }
}

// ---- go ----

async function main() {
  log.setConsole(params.get('debug') === '1');
  installGlobalErrorHandlers(window);
  applyViewportVars();
  watchViewport(() => {});
  pauseDropWhenHidden();
  if (DEBUG) window.game = { bus, save, log, ctx };

  if (DEBUG && params.get('fixture')) save.useMemoryOnly(); // before any slice is registered
  const result = await runSteps(steps);
  if (!result.ok) log.warn(`started with problems in: ${result.failed.join(', ')}`);
  if (result.fatal) showFatal('The game could not start. Your save is safe.');
}

main().catch((err) => {
  log.error('boot crashed', err);
  showFatal('The game could not start. Your save is safe.');
});
