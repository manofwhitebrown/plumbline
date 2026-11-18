// Volumes, mute, and the browser rules: wait for a first tap, sleep in a hidden tab.
import { warn } from './safe.js';

const state = { muted: false, sfx: 0.8, music: 0.5 };
let hidden = false;
let listening = false;

function clamp01(x) {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}

export function setMuted(flag) {
  state.muted = !!flag;
}

export function setLevels(v) {
  if (!v || typeof v !== 'object') return;
  if ('sfx' in v) state.sfx = clamp01(v.sfx);
  if ('music' in v) state.music = clamp01(v.music);
}

export function getState() {
  return { muted: state.muted, sfx: state.sfx, music: state.music, hidden };
}

export function isHidden() {
  return hidden;
}

// Push the numbers to the real volume knobs, with short ramps so there are no pops.
export function applyLevels(synth) {
  try {
    const t = synth.now();
    synth.buses.sfx.gain.setTargetAtTime(state.sfx * state.sfx, t, 0.02);
    synth.buses.music.gain.setTargetAtTime(state.music * state.music * 0.7, t, 0.05);
    synth.buses.master.gain.setTargetAtTime(state.muted ? 0 : 1, t, 0.02);
  } catch (e) {
    warn('levels failed', e);
  }
}

export function resumeContext(ctx) {
  try {
    if (ctx && ctx.state !== 'running' && !hidden) {
      const p = ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (e) {
    // Browser may refuse until a tap. We try again next time.
  }
}

// Suspend when the tab is hidden, resume when it comes back. Registers once.
export function watchVisibility(ctx) {
  if (listening || typeof document === 'undefined' || !document.addEventListener) return;
  listening = true;
  const onChange = () => {
    hidden = !!document.hidden;
    try {
      if (hidden) {
        const p = ctx.suspend();
        if (p && p.catch) p.catch(() => {});
      } else {
        resumeContext(ctx);
      }
    } catch (e) {
      // Ignore.
    }
  };
  document.addEventListener('visibilitychange', onChange);
  hidden = !!document.hidden;
}

// For tests.
export function resetMixer() {
  state.muted = false;
  state.sfx = 0.8;
  state.music = 0.5;
  hidden = false;
}
