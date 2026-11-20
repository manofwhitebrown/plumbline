// Hidden, password-locked cheat menu (logic only; AI-7 draws the panel).
// Nothing here is visible until reveal() is called. The password is never stored, only its hash.
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { resetAll } from '../core/save.js';
import { s, markCheated, changed } from '../meta/state.js';
import { now } from '../meta/time.js';
import { createGate } from './gate.js';
import { ALL_MONEY_GROUPS } from './catalog-money.js';
import { RUN, PLAY, TIME, PROGRESS } from './catalog-game.js';
import { TOOLS } from './catalog-tools.js';

const CATALOG = [...ALL_MONEY_GROUPS, ...RUN, ...PLAY, ...TIME, ...PROGRESS, ...TOOLS];
const GROUP_ORDER = ['Money', 'Parts and Rig', 'Upgrades', 'Run helpers', 'Time', 'Progress', 'Tools'];
const CONFIRM_WINDOW_MS = 8000;

export function makeCheats(gate) {
  let pendingConfirm = null; // { id, until }

  function wipe() {
    resetAll();                       // normal save reset: every slice back to defaults
    gate.lock();
    changed('reset');
    bus.emit('meta:collapsed', { coreDustGain: 0 }); // other modules re-check their rigs
  }

  return {
    reveal: () => gate.reveal(),
    isRevealed: () => gate.isRevealed(),
    tryPassword: (text) => gate.tryPassword(text),
    isUnlocked: () => gate.isUnlocked(),
    lock: () => { pendingConfirm = null; gate.lock(); },
    lockedForMs: () => gate.lockedForMs(),
    wasUsed: () => !!s().cheated,

    // The menu, grouped. Empty while locked.
    list() {
      if (!gate.isUnlocked()) return [];
      return GROUP_ORDER.map((group) => ({
        group,
        items: CATALOG.filter((c) => c.group === group).map((c) => ({
          id: c.id, label: c.label, toggle: !!c.toggle, on: c.isOn ? !!c.isOn() : false,
          danger: !!c.danger, needsConfirm: !!c.confirm,
        })),
      }));
    },

    // Run one cheat. Always returns { ok, text } and never throws.
    run(id) {
      try {
        if (!gate.isUnlocked()) return { ok: false, text: 'Locked' };
        const c = CATALOG.find((x) => x.id === id);
        if (!c) return { ok: false, text: 'Unknown cheat' };
        if (c.confirm) {
          const t = now();
          if (!pendingConfirm || pendingConfirm.id !== id || t > pendingConfirm.until) {
            pendingConfirm = { id, until: t + CONFIRM_WINDOW_MS };
            return { ok: false, needsConfirm: true, text: 'Press again to confirm. This wipes everything.' };
          }
          pendingConfirm = null;
          wipe();
          return { ok: true, text: 'Everything was reset' };
        }
        if (!c.tool) markCheated();     // first real cheat flags the save
        const out = c.run();
        const res = typeof out === 'string' ? { text: out } : out;
        const result = { ok: true, text: res.text, data: res.data };
        bus.emit('cheats:result', { id, text: result.text });
        return result;
      } catch (e) {
        log.error('cheat failed', id, e && e.message);
        return { ok: false, text: 'That cheat could not run' };
      }
    },

    // The owner's "start clean" button. Works without the password because it only erases.
    clearFlagAndReset() {
      try { pendingConfirm = null; wipe(); return { ok: true, text: 'Cheat flag cleared and progress reset' }; }
      catch (e) { log.error('reset failed', e && e.message); return { ok: false, text: 'Reset failed' }; }
    },
  };
}

export const cheats = makeCheats(createGate());
export default cheats;
