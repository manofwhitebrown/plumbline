// Public functions of the play layer. All safe: a bad call returns [] or null and never throws.
import { ABILITIES } from '../../data/abilities.js';
import { OFFER, boonById, SYNERGIES, TAG_NAMES } from '../../data/boons.js';
import { ENCOUNTERS } from '../../data/events.js';
import { resolveOffer, autoPickId } from './boons.js';
import { useAbility, abilityList, abilityCheck } from './abilities.js';
import { guardianActive } from './guardians.js';

export function chooseBoon(run, id) {
  try { return run && run.play && run.play.offer ? resolveOffer(run, id) : []; } catch (e) { return []; }
}
export function useSkill(run, id) {
  try { return run && run.play ? useAbility(run, id) : []; } catch (e) { return []; }
}
export function skillCheck(run, id) { try { return abilityCheck(run, id); } catch (e) { return 'off'; } }

// Everything the HUD and pickers need, in one small object. Read-only.
export function playView(run) {
  const P = run && run.play;
  if (!P) return null;
  const st = run.state, a = P.enc && P.enc.active, g = P.gd && P.gd.active;
  return {
    offer: P.offer, skills: abilityList(run),
    boons: P.boons.map((id) => { const b = boonById(id); return b ? { id, name: b.name, rarity: b.rarity, tags: b.tags } : null; }).filter(Boolean),
    synergies: P.fx.synergies.map((t) => ({ tag: t, name: SYNERGIES[t].name, desc: SYNERGIES[t].desc, tagName: TAG_NAMES[t] || t })),
    encounter: a ? { id: a.id, name: a.name, on: a.on, left: Math.max(0, a.endBeat - st.beat), warn: !a.on ? Math.max(0, a.startBeat - st.beat) : 0 } : null,
    echo: P.echoLeft, guardian: g ? { id: g.id, name: g.name, on: g.on, hp: g.hp, maxHp: g.maxHp, fight: guardianActive(run) } : null,
    nextOffer: P.nextOfferDepth, secondWinds: Math.max(0, P.fx.second - P.secondUsed), relics: P.relics.slice(), shards: P.shardsWon,
    stats: P.stats, seconds: OFFER.seconds, abilityDefs: ABILITIES, encounterDefs: ENCOUNTERS,
  };
}

// Headless helpers (bots, balance tests, fuzz): pick the middle-ish best boon, and press skills sensibly.
export function autoChoose(run) {
  const P = run && run.play;
  if (!P || !P.offer) return [];
  return chooseBoon(run, autoPickId(run));
}

export function autoSkills(run) {
  const P = run && run.play, out = [];
  if (!P || run.state.status !== 'running') return out;
  const st = run.state, frac = st.strain / Math.max(1, st.maxStrain), a = P.enc && P.enc.active;
  const incoming = a && (a.id === 'cave_in' || a.id === 'rope_weevil') && (a.on || a.startBeat - st.beat <= 1);
  const gd = P.gd && P.gd.active;
  if (!abilityCheck(run, 'brace') && (frac > 0.6 || incoming || (gd && frac > 0.45))) out.push(...useSkill(run, 'brace'));
  if (!abilityCheck(run, 'surge') && frac < 0.4 && !(gd && frac > 0.3) && (P.echoLeft > 0 || (a && a.id === 'gem_vein') || st.combo >= 6)) out.push(...useSkill(run, 'surge'));
  if (!abilityCheck(run, 'flare') && frac > 0.35) out.push(...useSkill(run, 'flare'));
  return out;
}
