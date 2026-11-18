// getMods(): the ONLY bridge from the meta game to the engine.
import { LIMITS } from '../data/upgrades.js';
import { s } from './state.js';
import { level } from './upgrades.js';
import { clamp, num } from './safe.js';
import { dailyTwistId } from './daily.js';

export function coreDustMult() {
  return 1 + LIMITS.coreDustGoldEach * s().coreDustTotal;
}

export function getMods() {
  const st = s();
  const bucket = level('bucket');
  const owned = Object.keys(st.parts).filter((id) => st.parts[id] > 0);
  const mods = {
    maxStrain: clamp(LIMITS.baseMaxStrain + 10 * level('rope'), 100, 1000),
    keepOnSnap: clamp(LIMITS.baseKeepOnSnap + 0.05 * level('mender') + 0.05 * level('cd_snap'), 0.3, LIMITS.maxKeepOnSnap),
    goldMult: clamp(coreDustMult(), 1, 1e300),
    strainMult: clamp(1 - 0.04 * level('grease'), LIMITS.minStrainMult, 1),
    luck: clamp(0.03 * level('lantern'), 0, 1),
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
  if (st.cheated && st.cheatStartDepth > 0) mods.startDepth = Math.max(mods.startDepth, st.cheatStartDepth);
  return mods;
}
