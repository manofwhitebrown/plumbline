// STUB: builds the HUD view object. Real version comes next.
export function buildView() {
  return {
    status: 'idle', depth: 0, gold: 0, strain: 0, maxStrain: 100, strain01: 0,
    biomeId: 'clay', biome: { id: 'clay', name: 'Clay', palette: { top: '#3a2a22', bottom: '#1b1410', accent: '#d9a06b' } },
    combo: 0, risk: { beatsToSnap: 0, goldAtRisk: 0, keepIfSnap: 0 },
    dangerLevel: 0, goals: [], bestDepth: 0, nextBiomeIn: 100,
  };
}
export default { buildView };
