// Volumes and mute. First version keeps the numbers only.

const state = { muted: false, sfx: 0.8, music: 0.5 };

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
  return { muted: state.muted, sfx: state.sfx, music: state.music };
}
