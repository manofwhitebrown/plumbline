// Cheats: run helpers (go into mods.cheat), time and progress.
import { s, setCheatMods, setCheatStartDepth } from '../meta/state.js';
import * as offline from '../meta/offline.js';
import * as daily from '../meta/daily.js';
import * as quests from '../meta/quests.js';
import * as collapse from '../meta/collapse.js';
import * as codex from '../meta/codex.js';
import * as achievements from '../meta/achievements.js';
import { fmtTime } from '../core/format.js';
import { fmt } from '../core/format.js';

const cm = () => (s().cheated && s().cheatMods) || {};

const toggle = (id, label, key, onText, offText) => ({
  id, group: 'Run helpers', label, toggle: true, isOn: () => !!cm()[key],
  run: () => { const on = !cm()[key]; setCheatMods({ [key]: on }); return on ? onText : offText; },
});
const speed = (v) => ({
  id: `speed_${v}`, group: 'Run helpers', label: `Drop speed x${v}`, isOn: () => cm().speedMult === v,
  run: () => { setCheatMods({ speedMult: v }); return `Drop speed is x${v}`; },
});
const startAt = (m) => ({
  id: `start_${m}`, group: 'Run helpers', label: `Always start at ${m} m`,
  run: () => { setCheatStartDepth(m); return `Every Drop starts at ${m} m`; },
});
const biome = (id, name) => ({
  id: `biome_${id}`, group: 'Run helpers', label: `Lock Biome: ${name}`, isOn: () => cm().forceBiome === id,
  run: () => { setCheatMods({ forceBiome: id }); return `Biome locked to ${name}`; },
});

export const RUN = [
  toggle('no_snap', 'Rope cannot Snap', 'noSnap', 'The rope cannot Snap', 'The rope can Snap again'),
  toggle('freeze_strain', 'Freeze Strain', 'freezeStrain', 'Strain is frozen', 'Strain moves again'),
  speed(0.5), speed(2), speed(4),
  { id: 'speed_1', group: 'Run helpers', label: 'Drop speed normal', run: () => { setCheatMods({ speedMult: 1 }); return 'Drop speed is normal'; } },
  startAt(100), startAt(250), startAt(500), startAt(1000),
  { id: 'start_0', group: 'Run helpers', label: 'Start at the top again', run: () => { setCheatStartDepth(0); return 'Drops start at the top'; } },
  biome('clay', 'Clay'), biome('quartz', 'Quartz'), biome('amber', 'Amber'), biome('magma', 'Magma'), biome('void', 'Void'), biome('abyss', 'Abyss'),
  { id: 'biome_off', group: 'Run helpers', label: 'Unlock the Biome', run: () => { setCheatMods({ forceBiome: null }); return 'Biome follows Depth again'; } },
  { id: 'gold_x10', group: 'Run helpers', label: 'Gold x10 inside Drops', isOn: () => cm().goldMult === 10,
    run: () => { const on = cm().goldMult !== 10; setCheatMods({ goldMult: on ? 10 : 1 }); return on ? 'Gold x10 inside Drops' : 'Gold inside Drops is normal'; } },
];

const skip = (hours) => ({
  id: `away_${hours}h`, group: 'Time', label: `Skip ${hours} h away`,
  run: () => { const p = offline.skip(hours * 3600 * 1000); return p ? `${fmtTime(p.ms)} away: ${fmt(p.gold)} Gold waiting` : 'Nothing to collect (no Crew yet)'; },
});

export const TIME = [
  skip(1), skip(8), skip(24),
  { id: 'daily_again', group: 'Time', label: 'Claim the daily reward again', run: () => { daily.allowClaimAgain(); return 'Daily reward can be claimed again'; } },
  { id: 'quests_all', group: 'Time', label: 'Finish all quests', run: () => { quests.completeAll(); return 'All quests are finished. Claim them in Rewards'; } },
];

const depthSet = (m) => ({
  id: `best_${m}`, group: 'Progress', label: `Set best Depth to ${m} m`,
  run: () => { s().bestDepth = m; return `Best Depth is now ${m} m`; },
});

export const PROGRESS = [
  { id: 'collapse_ready', group: 'Progress', label: 'Make Collapse available now', run: () => { collapse.makeReady(); return 'Collapse is ready'; } },
  { id: 'codex_all', group: 'Progress', label: 'Unlock every Codex entry', run: () => { return `${codex.recordAll()} Codex entries unlocked`; } },
  { id: 'ach_all', group: 'Progress', label: 'Unlock all achievements', run: () => { achievements.unlockAll(); return 'All achievements unlocked'; } },
  depthSet(100), depthSet(500), depthSet(1000), depthSet(2500),
];
