// Audio entry point (CONTRACT section 11). Every call is safe: bad input is ignored.
// Nothing makes a sound until init() has run from a real tap or key press.
import { createContext, createSynth } from './synth.js';
import { createSfx } from './sfx.js';
import { createUiSounds } from './ui-sounds.js';
import { createMusic } from './music.js';
import { createHeartbeat } from './heartbeat.js';
import { createEvents } from './events.js';
import * as mixer from './mixer.js';
import { warn } from './safe.js';

let parts = null;
let timer = null;
let strain01 = 0;
let pendingBiome = 'clay';

function clamp01(x) {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}

// Runs a few times a second: starts new music notes and the heartbeat.
function tick() {
  try {
    if (!parts || mixer.isHidden() || mixer.getState().muted) return;
    const t = parts.synth.now();
    parts.music.update(t);
    parts.heartbeat.update(t, strain01);
  } catch (e) {
    warn('tick failed', e);
  }
}

function startTimer() {
  if (timer || typeof setInterval === 'undefined') return;
  timer = setInterval(tick, 100);
  if (timer && timer.unref) timer.unref();
}

export const audio = {
  // Call on the first tap or key press. Safe to call again.
  init() {
    try {
      if (parts) {
        mixer.resumeContext(parts.ctx);
        return true;
      }
      const ctx = createContext();
      if (!ctx) return false;
      const synth = createSynth(ctx);
      const sfx = createSfx(synth);
      const music = createMusic(synth);
      const heartbeat = createHeartbeat(synth);
      const hooks = {
        strain: (v) => {
          strain01 = clamp01(v);
        },
        biome: (id) => music.setBiome(id),
        runStart: () => music.setMood(1, 1.5),
        runEnd: () => {
          strain01 = 0;
          heartbeat.reset();
          music.setMood(0, 1.2);
        },
      };
      parts = {
        ctx,
        synth,
        sfx,
        music,
        heartbeat,
        ui: createUiSounds(synth),
        handle: createEvents(synth, sfx, hooks),
      };
      mixer.applyLevels(synth);
      mixer.watchVisibility(ctx);
      music.setBiome(pendingBiome);
      startTimer();
      mixer.resumeContext(ctx);
      return true;
    } catch (e) {
      warn('init failed', e);
      parts = null;
      return false;
    }
  },

  // Engine events for one step, plus the current view. Skipped quietly if not ready.
  onEvents(events, view) {
    try {
      if (!parts || mixer.getState().muted || mixer.isHidden()) return;
      parts.handle(events, view);
    } catch (e) {
      warn('events failed', e);
    }
  },

  setBiome(id) {
    try {
      if (typeof id !== 'string' || !id) return;
      pendingBiome = id;
      if (parts) parts.music.setBiome(id);
    } catch (e) {
      warn('biome failed', e);
    }
  },

  // 0 to 1. The heartbeat starts at 0.75.
  setStrain(value01) {
    strain01 = clamp01(value01);
  },

  // Names: tap, buy, deny, open, close, claim, place, remove, achievement, daily, collapse.
  ui(name) {
    try {
      if (!parts || mixer.getState().muted || mixer.isHidden()) return;
      if (name === 'collapse') parts.sfx.collapse();
      else parts.ui.play(name);
    } catch (e) {
      warn('ui sound failed', e);
    }
  },

  // Extra: tell audio which screen is open. Music is softer on menus and silent on results.
  setScreen(id) {
    try {
      if (!parts) return;
      if (id === 'drop') parts.music.setMood(1, 1.2);
      else if (id === 'results') parts.music.setMood(0, 1.0);
      else parts.music.setMood(0.6, 1.5);
      if (id !== 'drop') {
        strain01 = 0;
        parts.heartbeat.reset();
      }
    } catch (e) {
      warn('screen failed', e);
    }
  },

  mute(flag) {
    try {
      mixer.setMuted(flag);
      if (parts) mixer.applyLevels(parts.synth);
    } catch (e) {
      warn('mute failed', e);
    }
  },

  setVolumes(v) {
    try {
      mixer.setLevels(v);
      if (parts) mixer.applyLevels(parts.synth);
    } catch (e) {
      warn('volumes failed', e);
    }
  },

  // For tests only.
  _debug() {
    return { ready: !!parts, strain01, parts, ...mixer.getState() };
  },
  _tick: tick,
  _reset() {
    if (timer) clearInterval(timer);
    timer = null;
    parts = null;
    strain01 = 0;
    pendingBiome = 'clay';
    mixer.resetMixer();
  },
};

export default audio;
