// Cheats: money, parts, rig and upgrades. Each one uses the normal meta functions.
import { s, markCheated } from '../meta/state.js';
import { addGold, addShards, addCoreDust, spendGold } from '../meta/wallet.js';
import * as workshop from '../meta/workshop.js';
import * as upgrades from '../meta/upgrades.js';
import * as partsApi from '../meta/partsApi.js';
import { UPGRADES } from '../data/upgrades.js';
import { fmt } from '../core/format.js';

const goldCheat = (id, label, amount) => ({
  id, group: 'Money', label,
  run: () => { const got = addGold(amount, { free: true }); return `Added ${fmt(got)} Gold`; },
});

export const MONEY = [
  goldCheat('gold_1k', 'Add 1K Gold', 1e3),
  goldCheat('gold_1m', 'Add 1M Gold', 1e6),
  goldCheat('gold_1b', 'Add 1B Gold', 1e9),
  goldCheat('gold_1t', 'Add 1T Gold', 1e12),
  { id: 'gold_x1000', group: 'Money', label: 'Gold x 1000',
    run: () => { const now = s().gold; const got = addGold(now * 999, { free: true }); return `Gold is now ${fmt(now + got)}`; } },
  { id: 'shards_100', group: 'Money', label: 'Add 100 Shards', run: () => { addShards(100); return 'Added 100 Shards'; } },
  { id: 'core_10', group: 'Money', label: 'Add 10 Core Dust', run: () => { addCoreDust(10); return 'Added 10 Core Dust'; } },
  { id: 'gold_zero', group: 'Money', label: 'Set Gold to 0', run: () => { spendGold(s().gold); return 'Gold is now 0'; } },
];

export const PARTS = [
  { id: 'parts_all', group: 'Parts and Rig', label: 'Unlock all Parts',
    run: () => { let n = 0; for (const p of partsApi.allParts()) if (workshop.setCount(p.id, Math.max(1, s().parts[p.id] || 0))) n++; return `You now own ${n} Parts`; } },
  { id: 'parts_x5', group: 'Parts and Rig', label: 'Own 5 copies of every Part',
    run: () => { let n = 0; for (const p of partsApi.allParts()) if (workshop.setCount(p.id, 5)) n++; return `5 copies of ${n} Parts`; } },
  { id: 'bucket_big', group: 'Parts and Rig', label: 'Biggest bucket (5 x 4)',
    run: () => { upgrades.setLevel('bucket', 2); return 'Bucket is now 5 x 4'; } },
  { id: 'parts_clear', group: 'Parts and Rig', label: 'Clear all Parts',
    run: () => { const parts = s().parts; for (const id of Object.keys(parts)) delete parts[id]; parts.hook = 1; return 'Only the Hook is left'; } },
];

export const UPGRADE_CHEATS = [
  { id: 'upg_max', group: 'Upgrades', label: 'Max all upgrades',
    run: () => { for (const u of UPGRADES) upgrades.setLevel(u.id, u.max); return 'All upgrades are at the top level'; } },
  { id: 'upg_reset', group: 'Upgrades', label: 'Reset upgrades',
    run: () => { for (const u of UPGRADES) upgrades.setLevel(u.id, 0); return 'All upgrades are back to level 0'; } },
];

export const ALL_MONEY_GROUPS = [...MONEY, ...PARTS, ...UPGRADE_CHEATS];
export { markCheated };
