// Ambient music per biome. First version only remembers the biome.

let currentBiome = 'clay';

export function setBiome(id) {
  if (typeof id === 'string' && id) currentBiome = id;
}

export function getBiome() {
  return currentBiome;
}
