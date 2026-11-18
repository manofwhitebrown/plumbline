// Event bus. bus.on(name, fn) returns a function that removes the handler.
// A handler that throws is logged and skipped. It never reaches the code that called emit.
import { log } from './log.js';

const handlers = new Map(); // name -> array of functions (replaced, never changed in place)
const NOOP = () => {};

export const bus = {
  on(name, fn) {
    if (typeof name !== 'string' || typeof fn !== 'function') {
      log.warn('bus.on needs a name and a function');
      return NOOP;
    }
    handlers.set(name, (handlers.get(name) || []).concat(fn));
    let active = true;
    return function off() {
      if (!active) return;
      active = false;
      const list = (handlers.get(name) || []).filter((h) => h !== fn);
      if (list.length) handlers.set(name, list);
      else handlers.delete(name);
    };
  },

  emit(name, payload) {
    const list = handlers.get(name);
    if (!list) return;
    // The array is never edited in place, so handlers may add or remove handlers while we loop.
    for (let i = 0; i < list.length; i++) {
      try {
        list[i](payload);
      } catch (err) {
        log.error(`bus handler for "${name}" failed`, err);
      }
    }
  },

  // For tests: remove every handler.
  clear() { handlers.clear(); }
};

export default bus;
