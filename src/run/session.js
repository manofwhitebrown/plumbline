// STUB: run session. Real version comes next. Signatures follow CONTRACT section 7.
const STUB_VIEW = Object.freeze({
  status: 'idle', depth: 0, gold: 0, strain: 0, maxStrain: 100, strain01: 0,
  biomeId: 'clay', biome: { id: 'clay', name: 'Clay', palette: { top: '#3a2a22', bottom: '#1b1410', accent: '#d9a06b' } },
  combo: 0, risk: { beatsToSnap: 0, goldAtRisk: 0, keepIfSnap: 0 },
  dangerLevel: 0, goals: [], bestDepth: 0, nextBiomeIn: 100,
});

export function start() { return { ok: true }; }
export function haul() { return { ok: false }; }
export function pause() {}
export function resume() {}
export function abort() {}
export function getView() { return STUB_VIEW; }

export const session = { start, haul, pause, resume, abort, getView };
export default session;
