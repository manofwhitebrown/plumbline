// Runs the Drop screen without touching the page. The screen hands in the pieces (bus, session, renderer,
// HUD, pause menu), so this can be tested with fakes. It always cleans up in dispose().
import { createHaulLock } from './haulLock.js';

function arr(x) { return Array.isArray(x) ? x : []; }

export function createDropController(d) {
  const bus = d.bus, session = d.session, renderer = d.renderer, hud = d.hud, pause = d.pause;
  const buzz = typeof d.buzz === 'function' ? d.buzz : () => {};
  const ui = typeof d.ui === 'function' ? d.ui : () => {};
  const offs = [];
  let dead = false, ended = false, started = false, lastLevel = 0, rig = null;

  function safe(fn) { try { return fn(); } catch (e) { return undefined; } }
  function viewNow() { return safe(() => session.getView()) || {}; }

  const lock = createHaulLock(() => {
    hud.setHauling(true);
    buzz('tap'); ui('tap');
    const res = safe(() => session.haul());
    if (res && res.ok === false) {
      // Nothing happened. If the drop is still going, give the button back.
      if (viewNow().status === 'running') hud.setHauling(false);
    }
    return res;
  });

  function onStarted(p) {
    if (dead) return;
    const view = p && p.view ? p.view : viewNow();
    safe(() => renderer.setRun(view, rig));
    safe(() => hud.update(view));
  }

  function onEvents(p) {
    if (dead || !p) return;
    const events = arr(p.events);
    safe(() => renderer.pushEvents(events));
    safe(() => hud.update(p.view));
    for (let i = 0; i < events.length; i++) {
      const t = events[i] && events[i].t;
      if (t === 'SNAP') buzz('snap');
      else if (t === 'RECORD') buzz('record');
    }
    const level = p.view && Number.isFinite(p.view.dangerLevel) ? p.view.dangerLevel : 0;
    if (level >= 2 && lastLevel < 2) buzz('warn');
    lastLevel = level;
  }

  function onEnded() {
    ended = true; // the shell shows Results right away
  }

  const api = {
    // Returns true when a drop is running (new or already going).
    start(opts) {
      if (dead || started) return started;
      rig = opts && opts.rig ? opts.rig : safe(() => d.getRig && d.getRig()) || null;
      offs.push(bus.on('run:started', onStarted));
      offs.push(bus.on('run:events', onEvents));
      offs.push(bus.on('run:ended', onEnded));
      offs.push(bus.on('run:aborted', () => { ended = true; }));
      if (typeof session.onFrame === 'function') {
        const off = safe(() => session.onFrame((dt, alpha) => { if (!dead) safe(() => renderer.frame(dt, alpha)); }));
        if (typeof off === 'function') offs.push(off);
      }
      if (typeof session.isRunning === 'function' && safe(() => session.isRunning())) {
        started = true; // come back to a drop that is already going
        onStarted({ view: viewNow() });
        api.openPause();
        return true;
      }
      const res = safe(() => session.start(opts || {}));
      if (!res || res.ok === false) {
        if (typeof d.onFail === 'function') safe(() => d.onFail(res && res.error));
        return false;
      }
      started = true;
      return true;
    },

    haul() {
      if (dead || ended || !started || pause.isOpen()) return false;
      return lock.press();
    },

    openPause() {
      if (dead || ended || lock.isLocked()) return false;
      safe(() => session.pause());
      pause.open();
      return true;
    },

    resume() {
      if (dead || ended) return false;
      pause.close();
      safe(() => session.resume());
      return true;
    },

    haulFromPause() {
      if (dead || ended || lock.isLocked()) return false;
      pause.close();
      safe(() => session.resume());
      return lock.press();
    },

    quit() {
      if (dead) return false;
      ended = true;
      pause.close();
      safe(() => session.abort());
      if (typeof d.onExit === 'function') safe(() => d.onExit('quit'));
      return true;
    },

    // Android back, browser back and Esc all land here. They open the pause menu, never leave.
    onBack() {
      if (dead || ended) return false;
      if (pause.isOpen()) api.resume();
      else api.openPause();
      return true;
    },

    // Space = Haul Up. Returns true when the key was used.
    onKey(e) {
      if (dead || !e) return false;
      if (e.key === ' ' || e.code === 'Space') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (!e.repeat) api.haul();
        return true;
      }
      return false;
    },

    onHidden() { return api.openPause(); },

    isEnded() { return ended; },

    dispose() {
      if (dead) return;
      dead = true;
      while (offs.length) safe(() => offs.pop()());
    },
  };
  return api;
}
