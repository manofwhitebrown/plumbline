// Where the engine finds parts and biome data.
// The game uses the real modules. Tests may swap them with setProviders() or `deps` in createRun.
import { biomes } from '../data/biomes.js';
import { loot } from '../data/loot.js';

const providers = {
  getPart: () => null,                    // replaced when the parts module is wired in
  byDepth: (d) => biomes.byDepth(d),
  byId: (id) => biomes.byId(id),
  lootTable: (biome, luck) => loot.table(biome, luck),
};

// Replace one or more providers (only the keys you pass).
export function setProviders(p) {
  if (!p || typeof p !== 'object') return;
  for (const k of Object.keys(providers)) if (typeof p[k] === 'function') providers[k] = p[k];
}

export function getProviders() {
  return providers;
}
