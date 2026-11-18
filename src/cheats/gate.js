// The password box logic. Everything here lives only in memory. Nothing is saved, so a fresh
// save can never start unlocked, and no URL or saved flag can open it.
import { matches, CHEAT_HASH } from './hash.js';
import { now } from '../meta/time.js';

export const MAX_TRIES = 5;
export const LOCK_MS = 30000;

// opts.expectedHash is for tests only.
export function createGate(opts = {}) {
  const expected = opts.expectedHash || CHEAT_HASH;
  let revealed = false;
  let unlocked = false;
  let wrong = 0;
  let lockedUntil = 0;

  return {
    reveal() { revealed = true; },
    isRevealed: () => revealed,
    isUnlocked: () => unlocked,
    lock() { unlocked = false; revealed = false; },
    // Seconds left in the lockout (0 if none).
    lockedForMs() { return Math.max(0, lockedUntil - now()); },
    // Never says how close a try was.
    tryPassword(text) {
      if (!revealed) return false;
      if (now() < lockedUntil) return false;      // ignore input while locked out
      if (matches(text, expected)) {
        unlocked = true;
        wrong = 0;
        return true;
      }
      wrong++;
      if (wrong >= MAX_TRIES) { lockedUntil = now() + LOCK_MS; wrong = 0; }
      return false;
    },
  };
}
