// One place for warnings, so audio never throws into the game.
import { log } from '../core/log.js';

export function warn(...args) {
  try {
    log.warn('[audio]', ...args);
  } catch (e) {
    // Nothing more we can do.
  }
}
