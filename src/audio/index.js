import { createContext } from './synth.js';
import { createEngine } from './engine.js';
import * as mixer from './mixer.js';
import { warn } from './safe.js';

let parts = null;
let timer = null;
let pendingBiome = 'clay';
let pendingQuality = null;
// Shared with the engine so setStrain and setBiome work before init too.
const state = { strain01: 0, combo: 0, depth: 0, biome: 'clay' };

function clamp01(x) {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}

// Runs a few times a second: starts new music notes and the heartbeat.
function tick() {
  try {
    if (!parts || mixer.isHidden() || mixer.getState().muted) return;
    parts.tick();
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
      parts = createEngine(ctx, { quality: pendingQuality || undefined, state });
      const synth = parts.synth;
      const music = parts.music;
      mixer.applyLevels(synth);
      mixer.watchVisibility(ctx);
      state.biome = pendingBiome;
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
      state.biome = id;
      if (parts) parts.music.setBiome(id);
    } catch (e) {
      warn('biome failed', e);
    }
  },

  // 0 to 1. The heartbeat starts at 0.75.
  setStrain(value01) {
    state.strain01 = clamp01(value01);
  },

  // Names: tap, buy, deny, open, close, claim, place, remove, achievement, daily, tab, toggle, slider, charge, collapse.
  // Optional arg: toggle(true/false), slider(0..1), charge(0..1).
  ui(name, arg) {
    try {
      if (!parts || mixer.getState().muted || mixer.isHidden()) return;
      if (name === 'collapse') parts.sfx.collapse();
      else parts.ui.play(name, arg);
    } catch (e) {
      warn('ui sound failed', e);
    }
  },

  // Extra: tell audio which screen is open ('home', 'drop', 'results', 'rig'...).
  // The score is the biome music on 'drop', gentle menu music on any menu, and quiet on 'results'
  // (it returns to the menu music by itself after a few seconds).
  setScreen(id) {
    try {
      if (!parts) return;
      parts.music.setScreen(id);
      if (id !== 'drop') {
        state.strain01 = 0;
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

  // Night mode for the settings screen: less dynamic range, softer highs and lows, a little quieter.
  setNightMode(flag) {
    try {
      mixer.setNight(flag);
      if (parts) mixer.applyLevels(parts.synth);
    } catch (e) {
      warn('night mode failed', e);
    }
  },

  // 'low' (fewer voices, no convolver reverb) or 'high'. Chosen automatically on low-memory phones.
  setQuality(q) {
    try {
      pendingQuality = q === 'low' ? 'low' : 'high';
      if (parts) parts.synth.setQuality(pendingQuality);
    } catch (e) {
      warn('quality failed', e);
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
    return { ready: !!parts, strain01: state.strain01, parts, ...mixer.getState() };
  },
  _tick: tick,
  _reset() {
    if (timer) clearInterval(timer);
    timer = null;
    parts = null;
    state.strain01 = 0;
    state.combo = 0;
    state.depth = 0;
    state.biome = 'clay';
    pendingBiome = 'clay';
    pendingQuality = null;
    mixer.resetMixer();
  },
};

export default audio;
