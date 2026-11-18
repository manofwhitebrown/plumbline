// One press only. The Haul Up button can be hammered, tapped and keyed at once: it fires one time.
// If the run says "not ok" (nothing to haul), the lock opens again so the player can retry.
export function createHaulLock(fire) {
  let locked = false;
  return {
    press() {
      if (locked) return false;
      locked = true;
      let res = null;
      try {
        res = typeof fire === 'function' ? fire() : null;
      } catch (e) {
        res = { ok: false };
      }
      if (res && res.ok === false) locked = false;
      return true;
    },
    isLocked() { return locked; },
    reset() { locked = false; },
  };
}
