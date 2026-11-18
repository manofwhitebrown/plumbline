// Shared test helpers. Not a test file itself.
import { resetAll } from '../src/core/save.js';
import { setTimeSource } from '../src/meta/time.js';
import { setPartsProvider } from '../src/meta/partsApi.js';

export const FAKE_PARTS = [
  { id: 'hook', name: 'Hook', family: 'collector', desc: 'Collects.', cost: 0, unlock: { type: 'start', value: 0 } },
  { id: 'magnet', name: 'Magnet', family: 'collector', desc: 'Pulls ore.', cost: 60, unlock: { type: 'start', value: 0 } },
  { id: 'polisher', name: 'Polisher', family: 'processor', desc: 'Raises gems.', cost: 400, unlock: { type: 'depth', value: 60 } },
  { id: 'smelter', name: 'Smelter', family: 'processor', desc: 'Ore to gems.', cost: 900, unlock: { type: 'gold', value: 2000 } },
  { id: 'prism', name: 'Prism', family: 'processor', desc: 'Shimmer.', cost: 5000, unlock: { type: 'codex', value: 'twin_hooks' } },
];

export const T0 = 1_700_000_000_000; // a fixed "now"
export const DAY = 86400000;

export function fresh(opts = {}) {
  resetAll();
  setPartsProvider({ getPart: (id) => FAKE_PARTS.find((p) => p.id === id) || null, allParts: () => FAKE_PARTS,
    allCombos: () => [{ id: 'twin_hooks', name: 'Twin Hooks', desc: 'Two hooks side by side.' }], detectCombos: () => [] });
  let t = opts.now ?? T0;
  setTimeSource(() => t, 0);
  return { setNow(v) { t = v; }, advance(ms) { t += ms; }, get now() { return t; } };
}
