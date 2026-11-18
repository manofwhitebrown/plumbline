// Surface crew: idle gold. Cost of next = base x 1.15^owned. Milestones double output.
import { CREW, MANAGER } from '../data/crew.js';
import { s, changed } from './state.js';
import { money, count } from './safe.js';
import { costOf, bulkCost, maxAffordable, milestoneMult, nextMilestone } from './economy.js';
import { level } from './upgrades.js';
import { coreDustMult } from './mods.js';

const BY_ID = new Map(CREW.map((c) => [c.id, c]));

export const owned = (id) => count(s().crew[id]);
export const hasManager = (id) => count(s().managers[id]) > 0;
export const totalOwned = () => CREW.reduce((a, c) => a + owned(c.id), 0);

// Bonus that applies to every crew: tools upgrade and Core Dust.
export function globalMult() {
  return (1 + 0.1 * level('tools')) * coreDustMult();
}

export function gpsOf(id) {
  const c = BY_ID.get(id);
  if (!c) return 0;
  const n = owned(id);
  if (n === 0) return 0;
  return money(n * c.baseGps * milestoneMult(n) * (hasManager(id) ? MANAGER.outputMult : 1) * globalMult());
}

export function perSecond() {
  let sum = 0;
  for (const c of CREW) sum += gpsOf(c.id);
  return money(sum);
}

function unlocked(c) { return s().bestDepth >= c.unlockDepth; }

export function list() {
  const gold = s().gold;
  return CREW.map((c) => {
    const n = owned(c.id);
    const isUnlocked = unlocked(c);
    const cost = costOf(c.baseCost, n);
    const mgrCost = money(c.baseCost * MANAGER.costMult);
    return {
      id: c.id, name: c.name, desc: c.desc, owned: n,
      unlocked: isUnlocked,
      reason: isUnlocked ? null : `Reach ${c.unlockDepth} m Depth to unlock`,
      cost, cost10: bulkCost(c.baseCost, n, 10),
      maxBuy: isUnlocked ? maxAffordable(c.baseCost, n, gold) : 0,
      canBuy: isUnlocked && gold >= cost,
      perSecond: gpsOf(c.id),
      mult: milestoneMult(n) * (hasManager(c.id) ? MANAGER.outputMult : 1),
      milestone: nextMilestone(n),
      manager: {
        owned: hasManager(c.id), cost: mgrCost,
        canBuy: isUnlocked && !hasManager(c.id) && n >= MANAGER.minOwned && gold >= mgrCost,
        reason: hasManager(c.id) ? 'Hired' : n < MANAGER.minOwned ? `Needs ${MANAGER.minOwned} Crew` : null,
      },
    };
  });
}

// qty: 1, 10, or 'max'.
export function buy(id, qty = 1) {
  const c = BY_ID.get(id);
  if (!c) return { ok: false, error: 'Unknown crew' };
  if (!unlocked(c)) return { ok: false, error: `Reach ${c.unlockDepth} m Depth to unlock` };
  const st = s();
  const n = owned(id);
  const want = qty === 'max' ? maxAffordable(c.baseCost, n, st.gold) : Math.max(1, count(qty, 100000));
  if (want < 1) return { ok: false, error: 'Not enough Gold' };
  const price = bulkCost(c.baseCost, n, want);
  if (st.gold < price) return { ok: false, error: 'Not enough Gold' };
  st.gold = money(st.gold - price);
  st.crew[id] = n + want;
  st.stats.crewBought = money(st.stats.crewBought + want);
  changed('crew');
  return { ok: true, bought: want, owned: n + want, paid: price };
}

export function hireManager(id) {
  const c = BY_ID.get(id);
  if (!c) return { ok: false, error: 'Unknown crew' };
  const st = s();
  if (hasManager(id)) return { ok: false, error: 'Already hired' };
  if (owned(id) < MANAGER.minOwned) return { ok: false, error: `Needs ${MANAGER.minOwned} Crew first` };
  const price = money(c.baseCost * MANAGER.costMult);
  if (st.gold < price) return { ok: false, error: 'Not enough Gold' };
  st.gold = money(st.gold - price);
  st.managers[id] = 1;
  changed('crew');
  return { ok: true, paid: price };
}

// Cheats and Collapse use this. Clamped.
export function setOwned(id, n) {
  if (!BY_ID.has(id)) return false;
  const v = count(n);
  if (v === 0) delete s().crew[id]; else s().crew[id] = v;
  return true;
}
export const crewIds = () => CREW.map((c) => c.id);
