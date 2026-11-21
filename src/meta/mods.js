// getMods(): the ONLY bridge from the meta game to the engine.
import { LIMITS, UPGRADES } from '../data/upgrades.js';
import { s } from './state.js';
import { level } from './upgrades.js';
import { clamp, num } from './safe.js';

// Round to 4 places so 0.68 is 0.68, not 0.6799999.
const per = (id) => { const u = UPGRADES.find((x) => x.id === id); return u ? u.per : 0; };
const r4 = (x) => Math.round(x * 10000) / 10000;
import { dailyTwistId } from './daily.js';
import { applyTwist } from '../engine/twists.js';
import { wallMods } from './relicBook.js'; // [FINISH-3] Relic Wall bonus (real finds only)

export function coreDustMult() {
  return 1 + LIMITS.coreDustGoldEach * s().coreDustTotal;
}

export function getMods() {
  const st = s();
  const bucket = level('bucket');
  const owned = Object.keys(st.parts).filter((id) => st.parts[id] > 0);
  const mods = {
    maxStrain: clamp(LIMITS.baseMaxStrain + per('rope') * level('rope'), 100, 1000),
    keepOnSnap: r4(clamp(LIMITS.baseKeepOnSnap + 0.05 * level('mender') + 0.05 * level('cd_snap'), 0.3, LIMITS.maxKeepOnSnap)),
    goldMult: r4(clamp(coreDustMult(), 1, 1e300)),
    strainMult: r4(clamp(1 - (per('grease') / 100) * level('grease'), LIMITS.minStrainMult, 1)),
    luck: r4(clamp(0.03 * level('lantern'), 0, 1)),
    startDepth: clamp(15 * level('deepstart'), 0, 5000),
    cols: bucket >= 1 ? 5 : 4,
    rows: bucket >= 2 ? 4 : 3,
    unlockedParts: owned.length ? owned : ['hook'],
    twist: st.daily.twistOn ? dailyTwistId() : null,
    cheat: null,
  };
  if (st.cheated && st.cheatMods) {
    const c = st.cheatMods;
    mods.cheat = {
      noSnap: !!c.noSnap,
      freezeStrain: !!c.freezeStrain,
      speedMult: clamp(num(c.speedMult, 1), 0.1, 10),
      forceBiome: typeof c.forceBiome === 'string' ? c.forceBiome : null,
      goldMult: clamp(num(c.goldMult, 1), 1, 1e6),
    };
  }
  // Relic Wall bonus: +1% Gold at 10 relics, +1% better gems at 20, +2% Gold at 36. Cheated saves get nothing.
  try { const w = wallMods(); if (w.gold > 0) mods.goldMult = r4(mods.goldMult * (1 + w.gold)); if (w.luck > 0) mods.luck = r4(clamp(mods.luck + w.luck, 0, 1)); } catch (e) { /* the Wall never breaks a Drop */ }
  if (st.cheated && st.cheatStartDepth > 0) mods.startDepth = Math.max(mods.startDepth, st.cheatStartDepth);
  // Daily twist: change the numbers for today. Unknown fields are kept; a bad twist id changes nothing.
  let out = mods;
  if (mods.twist) {
    try { out = applyTwist(mods, mods.twist) || mods; } catch (e) { out = mods; }
    out.maxStrain = clamp(num(out.maxStrain, mods.maxStrain), 20, 1000);
    out.keepOnSnap = clamp(num(out.keepOnSnap, mods.keepOnSnap), 0, LIMITS.maxKeepOnSnap);
    out.cheat = mods.cheat;
    out.twist = mods.twist;
  }
  return out;
}
