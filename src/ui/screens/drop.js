// The Drop screen: the well canvas, the HUD on top, the pause menu. The logic lives in logic/dropController.js.
import '../styles/drop.css';
import { registerScreen, go, toast } from '../shell.js';
import { h, createScope } from '../dom.js';
import { api } from '../api.js';
import { bus, ui, audioCall, log } from '../soft.js';
import { buzz } from '../../platform/haptics.js';
import { getSettings, onSettings } from '../settings.js';
import { createDropController } from '../logic/dropController.js';
import { createHud } from './dropHud.js';
import { createPauseMenu } from './dropPause.js';

let scope = null;
let controller = null;
let renderer = null;
let session = null;

// If the page was closed in the middle of a drop, the game pays it once as a Snap. Tell the player.
let recoveredOff = null;
function listenForRecovery() {
  if (recoveredOff) return;
  recoveredOff = bus.on('run:recovered', (p) => {
    const kept = p && Number.isFinite(p.kept) ? p.kept : 0;
    toast('Your last drop was saved. You kept ' + Math.floor(kept) + ' Gold.', 'info');
  });
}
listenForRecovery();

const noRenderer = { resize() {}, setRun() {}, pushEvents() {}, frame() {}, setQuality() {}, setReduceMotion() {}, destroy() {} };

function makeRenderer(canvas) {
  try {
    const create = api.createRenderer;
    if (typeof create !== 'function') return noRenderer;
    const s = getSettings();
    return create(canvas, { reduceMotion: !!s.reduceMotion, quality: s.quality }) || noRenderer;
  } catch (e) {
    log.error('drop: renderer failed', e);
    return noRenderer;
  }
}

registerScreen('drop', {
  mount(el) {
    scope = createScope();
    session = api.session;
    const canvas = h('canvas', { class: 'drop-canvas', role: 'img', 'aria-label': 'Looking down the well' });
    const stage = h('div', { class: 'drop-stage', 'data-tut': 'well' }, canvas);
    renderer = makeRenderer(canvas);

    // The pause menu and the HUD talk to the controller. The controller is created just after them.
    const pause = createPauseMenu({
      onResume: () => controller && controller.resume(),
      onHaul: () => controller && controller.haulFromPause(),
      onQuit: () => controller && controller.quit(),
    }, scope);
    const hud = createHud({
      onHaul: () => controller && controller.haul(),
      onPause: () => controller && controller.openPause(),
    }, scope);

    const screen = h('section', { class: 'screen no-pad screen-drop' }, stage, ...hud.nodes, pause.el);
    el.append(screen);

    // Keep the canvas sharp and the right size.
    let lastW = 0, lastH = 0, lastDpr = 0;
    function fit() {
      try {
        const r = stage.getBoundingClientRect();
        const w = Math.round(r.width), hh = Math.round(r.height);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (w < 1 || hh < 1 || (w === lastW && hh === lastH && dpr === lastDpr)) return;
        lastW = w; lastH = hh; lastDpr = dpr;
        renderer.resize(w, hh, dpr);
      } catch (e) { log.warn('drop: resize failed'); }
    }
    fit();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(fit);
      ro.observe(stage);
      scope.add(() => ro.disconnect());
    }
    scope.on(window, 'resize', fit);
    scope.on(window, 'orientationchange', fit);

    scope.add(onSettings((s) => {
      try { renderer.setReduceMotion(!!s.reduceMotion); renderer.setQuality(s.quality); } catch (e) { /* ignore */ }
    }));

    controller = createDropController({
      bus, session, renderer, hud, pause, buzz, ui,
      getRig: () => (api.rigs && api.rigs.getRig ? api.rigs.getRig() : null),
      onExit: () => { go('home', undefined, { replace: true }); },
      onFail: (msg) => {
        toast(msg || 'Could not start the drop. Try again.', 'error');
        go('home', undefined, { replace: true });
      },
    });

    // Space = Haul Up. Esc and back are handled by the shell, which calls onBack below.
    scope.on(window, 'keydown', (e) => {
      if (!controller || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (pause.isOpen()) return; // let the menu buttons use Space and Enter
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      controller.onKey(e);
    });
    // A hidden tab pauses the drop.
    scope.on(document, 'visibilitychange', () => { if (document.hidden && controller) controller.onHidden(); });

    audioCall('setScreen', 'drop');

    // The tutorial may ask for a special first drop. It returns null on every other drop.
    let opts = {};
    try {
      const t = api.tutorial;
      const o = t && typeof t.runOptions === 'function' ? t.runOptions() : null;
      if (o && typeof o === 'object') opts = { ...o };
    } catch (e) { opts = {}; }
    controller.start(opts);
  },

  // Esc, browser back and the Android back button open the pause menu. They never leave the drop.
  onBack() {
    return controller ? controller.onBack() : false;
  },

  unmount() {
    const c = controller;
    controller = null;
    try {
      // Left while a drop is still going (not ended, not quit): stop the clock so nothing runs unseen.
      if (c && !c.isEnded() && session && typeof session.pause === 'function') session.pause();
    } catch (e) { /* ignore */ }
    if (c) c.dispose();
    if (scope) scope.dispose();
    scope = null;
    try { if (renderer) renderer.destroy(); } catch (e) { /* ignore */ }
    renderer = null;
    session = null;
  },
});
