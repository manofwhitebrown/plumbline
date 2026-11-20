// Owner cheats for the play layer. mods.cheat.play goes through this so only known, safe keys get in.
import { ENCOUNTER_IDS } from '../../data/events.js';
import { GUARDIANS } from '../../data/bosses.js';

export function cleanPlayCheat(c) {
  if (!c || typeof c !== 'object') return null;
  const out = {};
  if (c.giveBoons === 'all') out.giveBoons = 'all';
  if (c.freeSkills === true) out.freeSkills = true;
  if (c.allSkills === true) out.allSkills = true;
  const fo = Number(c.firstOfferDepth);
  if (Number.isFinite(fo) && fo >= 0 && fo <= 5000) out.firstOfferDepth = Math.floor(fo);
  if (typeof c.forceEncounter === 'string' && ENCOUNTER_IDS.indexOf(c.forceEncounter) >= 0) out.forceEncounter = c.forceEncounter;
  if (typeof c.forceGuardian === 'string' && GUARDIANS.some((g) => g.id === c.forceGuardian)) out.forceGuardian = c.forceGuardian;
  return Object.keys(out).length ? out : null;
}
