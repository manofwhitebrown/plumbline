// Processors change what rises past them. Put them BELOW the part that grabs.
import { mk, fire, num, isLoot, capValue, stateOf } from './util.js';
import { PART_DATA, TIER_MULT } from '../../data/parts.js';

const T = (id) => PART_DATA[id].tune;

export const processors = [
  mk('polisher', {
    onItem(ctx, item) {
      if (item.kind !== 'gem' || item.tier >= 6) return item;
      const up = Math.min(T('polisher').tierUp, 6 - item.tier);
      item.tier += up;
      item.value = capValue(item.value * Math.pow(TIER_MULT, up));
      fire(ctx);
      return item;
    },
  }),
  mk('multiplier', {
    onItem(ctx, item) {
      if (!isLoot(item)) return item;
      const f = T('multiplier').factors;
      const level = Math.min(f.length, Math.max(1, Math.floor(num(ctx.run.mods && ctx.run.mods.multiplierLevel, 1))));
      item.value = capValue(item.value * f[level - 1]);
      fire(ctx);
      return item;
    },
  }),
  mk('smelter', {
    onItem(ctx, item) {
      if (item.kind !== 'ore') return item;
      item.kind = 'gem';
      item.tier = T('smelter').toTier;
      item.value = capValue(item.value * T('smelter').valueBoost);
      fire(ctx);
      return item;
    },
  }),
  mk('splitter', {
    onItem(ctx, item) {
      if (!isLoot(item) || item.fromSplit) return item;
      const cols = ctx.run.rig ? ctx.run.rig.cols : 0;
      for (let dc = -1; dc <= 1; dc += 2) {
        const lane = ctx.c + dc;
        if (lane < 0 || lane >= cols) continue;
        const copy = Object.assign({}, item, { value: item.value * T('splitter').share, fromSplit: true, collected: false });
        ctx.spawn(lane, copy);
      }
      fire(ctx);
      return item;
    },
  }),
  mk('amplifier', {
    onItem(ctx, item) {
      if (!isLoot(item)) return item;
      const t = T('amplifier');
      const n = Math.min(ctx.run.fx.fired, t.maxFires);
      item.value = capValue(item.value * (1 + n * t.perFire));
      fire(ctx);
      return item;
    },
  }),
  mk('gilder', {
    onItem(ctx, item) {
      if (!isLoot(item)) return item;
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      st.n = (st.n || 0) + 1;
      if (st.n % T('gilder').every === 0) item.value = capValue(item.value * T('gilder').factor);
      fire(ctx);
      return item;
    },
  }),
  mk('prism', {
    onItem(ctx, item) {
      const t = T('prism');
      if (item.kind !== 'gem' || item.tier < t.minTier) return item;
      let pair = false;
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (let i = 0; i < dirs.length; i++) {
        const n = ctx.neighbor(dirs[i][0], dirs[i][1]);
        if (n && n.partId === 'prism' && ctx.hasFired(n.r, n.c)) pair = true;
      }
      if (pair) { item.value = capValue(item.value * t.factor); item.shimmer = true; }
      fire(ctx);
      return item;
    },
  }),
];
