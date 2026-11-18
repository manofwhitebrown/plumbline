// One place for warnings, so audio never throws into the game.
// When core/log.js is on main, only this file needs to change.

export function warn(...args) {
  try {
    if (typeof console !== 'undefined' && console.warn) console.warn('[audio]', ...args);
  } catch (e) {
    // Nothing more we can do.
  }
}
