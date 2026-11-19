// Volumes, mute, night mode, and the browser rules: wait for a first tap, sleep in a hidden tab.
import { warn } from './safe.js';

// Master gain never goes above SAFE_MAX, so even all sliders at 100% stay below clipping.
export const SAFE_MAX = 0.9;
// Trims that bring a typical play scene to about -16 LUFS (measured offline, see docs/notes/AUDIO-2.md).
export const SFX_TRIM = 1;
export const MUSIC_TRIM = 0.7;

const state = { muted: false, sfx: 0.8, music: 0.5, night: false };
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

export function setNight(flag) {
  state.night = !!flag;
}

export function getState() {
  return { muted: state.muted, sfx: state.sfx, music: state.music, night: state.night, hidden };
}

export function isHidden() {
  return hidden;
}

// Push the numbers to the real volume knobs, with short ramps so there are no pops.
// Slider position is squared so the middle of the slider is a comfortable level.
export function applyLevels(synth) {
  try {
    synth.setLevels({
      sfx: state.sfx * state.sfx * SFX_TRIM,
      music: state.music * state.music * MUSIC_TRIM,
      master: state.muted ? 0 : SAFE_MAX,
    });
    synth.setNightMode(state.night);
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
  state.night = false;
  hidden = false;
}
