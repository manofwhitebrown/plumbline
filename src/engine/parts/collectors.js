// Collectors grab things. A grabbed item stops rising and is paid by the engine.
import { mk, fire } from './util.js';
import { PART_DATA } from '../../data/parts.js';

const T = (id) => PART_DATA[id].tune;

function grab(ctx, item) {
  item.collected = true;
  fire(ctx);
  return item;
}

export const collectors = [
  mk('hook', {
    onItem(ctx, item) {
      return item.kind === 'gem' || item.kind === 'ore' ? grab(ctx, item) : item;
    },
  }),
  mk('magnet', {
    reach: [-1, 0, 1],
    onItem(ctx, item) {
      if (item.kind === 'ore') return grab(ctx, item);
      // [ECONOMY-2] A second wide collector so the Net is not a must-have: side-column gems at half pay.
      if (item.kind === 'gem' && ctx.dLane !== 0) { item.value *= T('magnet').sidePay; return grab(ctx, item); }
      return item;
    },
  }),
  mk('net', {
    reach: [0, 1],
    onItem(ctx, item) {
      if (item.kind !== 'gem') return item;
      if (ctx.dLane === 1) item.value *= T('net').neighborPay;
      return grab(ctx, item);
    },
  }),
  mk('vacuum', {
    onBeat(ctx) {
      ctx.run.fx.strainDelta += T('vacuum').strain;
      fire(ctx);
    },
    onItem(ctx, item) {
      return item.kind === 'gem' || item.kind === 'ore' || item.kind === 'relic' ? grab(ctx, item) : item;
    },
  }),
];
