// Engine parts change speed, timing and power.
import { mk, fire, stateOf, num } from './util.js';
import { PART_DATA } from '../../data/parts.js';

const T = (id) => PART_DATA[id].tune;

export const engineParts = [
  mk('drill', {
    reach: [],
    onBeat(ctx) {
      const fx = ctx.run.fx;
      fx.speedAdd += T('drill').speed;
      fx.strainDelta += T('drill').strain;
      fire(ctx);
    },
  }),
  mk('anchor', {
    reach: [],
    onBeat(ctx) {
      const fx = ctx.run.fx;
      fx.speedAdd -= T('anchor').speed;
      fx.strainDelta -= T('anchor').strain;
      fire(ctx);
    },
  }),
  mk('metronome', {
    reach: [],
    onBeat(ctx) {
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      st.n = (st.n || 0) + 1;
      if (st.n % T('metronome').every === 0) {
        ctx.run.fx.doubleRow[ctx.r] = 1; // each part works twice at most
        fire(ctx);
      }
    },
  }),
  mk('battery', {
    reach: [],
    onCollect(ctx, rec) {
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      const t = T('battery');
      if (num(st.charge, 0) >= t.need) {
        rec.item.value *= t.factor;
        st.charge = 0;
        fire(ctx);
      } else {
        st.charge = num(st.charge, 0) + 1;
      }
    },
  }),
];
