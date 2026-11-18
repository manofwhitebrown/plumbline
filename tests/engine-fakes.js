// Tiny fake parts for engine tests only. The real parts live in src/engine/parts/ (AI-3).
const PARTS = {
  hook: { id: 'hook', onItem(ctx, it) { if (!it.collected && it.kind !== 'hazard') ctx.collect(it); return it; } },
  polisher: { id: 'polisher', onItem(ctx, it) { if (it.kind === 'gem' && it.tier < 6) ctx.setTier(it, it.tier + 1); return it; } },
  plate: { id: 'plate', onHazard(ctx) { ctx.mem.n = (ctx.mem.n || 0) + 1; return ctx.mem.n % 2 === 1; } },
  splitter: { id: 'splitter', onItem(ctx, it) { if (it.kind === 'gem') { ctx.addToLane(ctx.c - 1, it); ctx.addToLane(ctx.c + 1, it); } return it; } },
  oilcan: { id: 'oilcan', onBeat(ctx) { ctx.addStrain(-0.5); } },
  vacuum: { id: 'vacuum', onItem(ctx, it) { ctx.collect(it); return it; }, onBeat(ctx) { ctx.addStrain(1); } },
  drill: { id: 'drill', passive(m) { m.speedBonus = (m.speedBonus || 0) + 1; m.flatStrain = (m.flatStrain || 0) + 0.3; return m; } },
  rope: { id: 'rope', passive(m) { m.maxStrain += 20; return m; } },
  metro: { id: 'metro', onBeat(ctx) { if (ctx.beat % 4 === 0) ctx.trigger(ctx.r, ctx.c + 1); } },
  boom: { id: 'boom', onItem() { throw new Error('boom'); } },
  nanpart: { id: 'nanpart', onItem(ctx, it) { ctx.addStrain(NaN); ctx.collect({ kind: 'gem', tier: 1, value: NaN }); return it; } },
};

export const fakeDeps = { getPart: (id) => PARTS[id] || null };

// Build a rig from rows of ids (top row first). Use '.' for empty.
export function rigOf(rows, cols = 4) {
  return { cols, rows: rows.length, cells: rows.map((r) => Array.from({ length: cols }, (_, i) => (r[i] && r[i] !== '.' ? r[i] : null))) };
}

export const STARTER = rigOf([['.', '.', '.', '.'], ['.', '.', '.', '.'], ['.', 'hook', '.', '.']]);

// A different random rig for each seed number (uses only fake parts)
export function randomRig(rng) {
  const ids = Object.keys(PARTS).filter((k) => k !== 'boom' && k !== 'nanpart');
  const cols = rng.int(4, 5), rows = rng.int(3, 4);
  return { cols, rows, cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng.chance(0.5) ? rng.pick(ids) : null))) };
}
