// Defense parts block dangers or ease the rope.
import { mk, fire, stateOf } from './util.js';
import { PART_DATA } from '../../data/parts.js';

const T = (id) => PART_DATA[id].tune;

export const defense = [
  mk('plate', {
    reach: [], hazardReach: [0], hazardPriority: 1,
    onBeat(ctx) {
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      if (st.cool > 0) st.cool--;
    },
    onHazard(ctx) {
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      if (st.cool > 0) return false;
      st.cool = T('plate').cooldown;
      fire(ctx);
      return true;
    },
  }),
  mk('shield', {
    reach: [], hazardReach: [-1, 0, 1], hazardPriority: 2,
    onHazard(ctx) {
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      if (st.charges === undefined) st.charges = T('shield').charges;
      if (st.charges <= 0) return false;
      st.charges--;
      fire(ctx);
      return true;
    },
  }),
  mk('oilcan', {
    reach: [],
    onBeat(ctx) {
      ctx.run.fx.strainDelta -= T('oilcan').strain;
      fire(ctx);
    },
  }),
  mk('cooler', {
    reach: [],
    onCollect(ctx, rec) {
      if (rec.lane !== ctx.c || !rec.item || rec.item.kind !== 'gem') return;
      ctx.run.fx.strainDelta -= T('cooler').strain;
      fire(ctx);
    },
  }),
  mk('spikeguard', {
    onItem(ctx, item) {
      if (item.kind !== 'hazard') return item;
      item.kind = 'ore';
      item.tier = 1;
      item.value = T('spikeguard').oreValue;
      delete item.hazard;
      fire(ctx);
      return item;
    },
  }),
  mk('sparerope', {
    reach: [],
    passive(mods) {
      if (mods.spareRopeApplied) return mods;
      const base = Number.isFinite(mods.maxStrain) ? mods.maxStrain : 100;
      return Object.assign({}, mods, { maxStrain: base + T('sparerope').extra, spareRopeApplied: true });
    },
  }),
];
