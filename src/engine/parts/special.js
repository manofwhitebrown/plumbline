// Special parts: peeking, rare finds, relics, repeats and blasts.
import { mk, fire, stateOf, num, capValue } from './util.js';
import { PART_DATA } from '../../data/parts.js';

const T = (id) => PART_DATA[id].tune;

export const special = [
  mk('lantern', {
    reach: [],
    onBeat(ctx) {
      const fx = ctx.run.fx;
      if (ctx.c < fx.reveal.length) fx.reveal[ctx.c] = Math.max(fx.reveal[ctx.c], T('lantern').peek);
      fire(ctx);
    },
    passive(mods) {
      const more = num(mods.relicBonus, 0) + T('lantern').relicBonus;
      return Object.assign({}, mods, { relicBonus: Math.min(0.5, more) });
    },
  }),
  mk('compass', {
    reach: [],
    passive(mods) {
      if (mods.compassApplied) return mods;
      return Object.assign({}, mods, { rareMult: num(mods.rareMult, 1) * T('compass').rareMult, compassApplied: true });
    },
  }),
  mk('jackpot', {
    collects: true,
    onItem(ctx, item) {
      if (item.kind !== 'relic') return item;
      item.collected = true;
      fire(ctx);
      return item;
    },
  }),
  mk('echo', {
    reach: [],
    onBeatEnd(ctx, grabs) {
      const st = stateOf(ctx.run, ctx.r, ctx.c);
      const fx = ctx.run.fx;
      if (grabs <= 0) return;
      if (num(st.mem, 0) > 0) {
        const rec = fx.collected[fx.nCollected] || (fx.collected[fx.nCollected] = {});
        rec.item = { kind: 'gem', tier: 1, value: capValue(st.mem * T('echo').share), echo: true, collected: true };
        rec.lane = ctx.c; rec.r = ctx.r; rec.c = ctx.c; rec.echo = true;
        fx.nCollected++;
        fire(ctx);
      }
      // Remember the last real grab (never an echo, so echoes cannot echo).
      for (let i = grabs - 1; i >= 0; i--) {
        const g = fx.collected[i];
        if (g && !g.echo && g.item) { st.mem = num(g.item.value, 0); break; }
      }
    },
  }),
  mk('fuse', {
    reach: [], hazardReach: [0], blastsDangers: true,
    onHazard(ctx) {
      const fx = ctx.run.fx;
      let blew = false;
      for (let i = 0; i < fx.nHazards; i++) {
        const rec = fx.hazards[i];
        if (rec.absR >= 0 || Math.abs(rec.lane - ctx.lane) !== 1) continue;
        rec.absR = ctx.r; rec.absC = ctx.c; rec.blasted = true;
        fx.bonusValue += T('fuse').bonusValue;
        if (fx.fqLen < 64) fx.fuseQueue[fx.fqLen++] = rec; // may set off the next Fuse
        blew = true;
      }
      if (blew) fire(ctx);
      return false;
    },
  }),
];
