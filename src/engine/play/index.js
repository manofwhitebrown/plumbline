// The play layer: boons, tap skills, encounters, guardians. A run has it only when createRun gets a `play` option,
// so old callers see no change. Everything here is seeded (one stream: `P.rng`) and counted in steps, so replays stay exact.
import { makeRng } from '../../core/rng.js';
import { PLAY_DEFAULTS, FAIRNESS } from '../../data/play.js';
import { BOONS } from '../../data/boons.js';
import { OFFER } from '../../data/boons.js';
import { ABILITIES } from '../../data/abilities.js';
import { GUARDIAN_RULES } from '../../data/bosses.js';
import { ENGINE } from '../../data/engine.js';
import { TIER_VALUE } from '../../data/loot.js';
import { rollRelic } from '../../data/relics.js';
import { ev } from '../events.js';
import { mixSeed, biomeFor } from '../spawn.js';
import { depthBonus } from '../gold.js';
import { computeFx, emptyFx, affinityMap } from './fx.js';
import { initAbilities, syncAbilities, tickAbilities } from './abilities.js';
import { initEncounters, tickEncounters, onEncounterHazardHit } from './encounters.js';
import { initGuardians, tickGuardian, guardianActive, resolveGuardian } from './guardians.js';
import { guardianBusy } from './guardianGate.js';
import { makeBoonOffer, makeMerchantOffer } from './boons.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// First offer depth after `depth`: every OFFER.every metres, plus the Biome edges.
export function nextOfferAfter(depth) {
  const e = OFFER.every;
  let next = (Math.floor(depth / e) + 1) * e;
  for (const edge of OFFER.biomeEdges) if (edge > depth && edge < next) next = edge;
  return next;
}

export function createPlay(run, input) {
  const cheatPlay = run.mods && run.mods.cheat && typeof run.mods.cheat.play === 'object' ? run.mods.cheat.play : null; // owner cheats (docs/CHEATS.md)
  const opts = Object.assign({}, PLAY_DEFAULTS, input && typeof input === 'object' ? input : {}, cheatPlay || {});
  if (cheatPlay && cheatPlay.allSkills) opts.abilities = ['brace', 'surge', 'flare'];
  const st = run.state;
  const P = {
    opts, rng: makeRng(mixSeed(run.seed, 0x504c4159)), aff: affinityMap(run.rig), boons: [], fx: emptyFx(),
    offer: null, wantOffer: '', plan: {}, clear: {}, noClear: {}, cover: null, coverWide: false, relics: [], shardsWon: 0,
    gnaw: 0, baseMax: st.maxStrain, baseKeep: run.mods.keepOnSnap, baseLuck: run.mods.luck, baseRelic: run.mods.relicBonus,
    echoLeft: 0, secondUsed: 0, wardUsed: 0, noGrab: 0, chainsBeat: 0, snapLuckUntil: -1, nextOfferDepth: 0,
    sm: { strainMult: run.mods.strainMult }, scratch: [],
    stats: { uses: {}, enc: {}, encWon: {}, gd: {}, picks: 0, offers: 0, surgeStrain: 0, hazStrain: 0, hazHits: 0, baseStrain: 0, braceEase: 0 },
  };
  run.play = P;
  P.recompute = (r, soft) => recompute(r, soft);
  initAbilities(P, opts);
  initEncounters(P, opts);
  initGuardians(P, opts, run);
  P.nextOfferDepth = typeof opts.firstOfferDepth === 'number' ? opts.firstOfferDepth : nextOfferAfter(st.depth);
  if (opts.snapLuck > 0) P.snapLuckUntil = st.depth + FAIRNESS.snapLuckMetres;
  if (cheatPlay && cheatPlay.giveBoons === 'all') for (const b of BOONS) { if (P.boons.indexOf(b.id) < 0) P.boons.push(b.id); }
  recompute(run, true);
  return P;
}

// Work out the boon numbers again and push them into the run's own numbers (max strain, luck, keep, relic odds).
function recompute(run) {
  const P = run.play, st = run.state, L = ENGINE.limits;
  P.fx = computeFx(P.boons, P.aff);
  syncAbilities(P);
  const fx = P.fx;
  st.maxStrain = Math.max(10, P.baseMax * (1 + fx.maxStrain) - P.gnaw);
  run.mods.keepOnSnap = clamp(P.baseKeep + fx.keep, 0, 1);
  const snapBonus = P.snapLuckUntil >= 0 && st.depth <= P.snapLuckUntil ? FAIRNESS.snapLuckAmount : 0;
  run.mods.luck = clamp(P.baseLuck + fx.luck + snapBonus, L.luck[0], L.luck[1]);
  run.mods.relicBonus = clamp(P.baseRelic + fx.relic, 0, 1);
  P.sm.strainMult = run.mods.strainMult * Math.max(0.3, 1 - fx.strain);
  P.cover = null;
}

// Start of every step (after the old per-step reset).
export function playBegin(run, out) {
  const P = run.play;
  P.chainsBeat = 0; P.scratch.length = 0;
  tickAbilities(run, out);
  if (P.echoLeft > 0) P.echoLeft--;
  tickEncounters(run, out);
  tickGuardian(run, out);
  if (P.snapLuckUntil >= 0 && run.state.depth > P.snapLuckUntil) { P.snapLuckUntil = -1; recompute(run); }
}

// Metres this step: boons add, Brace slows, a guardian fight crawls.
export function playSpeed(run, speed) {
  const P = run.play;
  speed += P.fx.speed;
  if (P.braceLeft > 0) speed *= ABILITIES.brace.slowMult;
  if (guardianActive(run)) speed = GUARDIAN_RULES.crawl;
  return speed;
}

// Gold factor for one grab: boons, Surge, Echo Chamber, chain links, Combo step.
export function playGoldFactor(run, rec, item) {
  const P = run.play, fx = P.fx;
  let f = 1 + fx.gold;
  if (item.kind === 'gem') { f *= 1 + fx.gem; if (item.tier >= 4) f *= 1 + fx.big; } else if (item.kind === 'ore') f *= 1 + fx.ore;
  const def = run.parts[rec.r * run.cols + rec.c];
  const fam = def && def.family;
  if (fam && fx.famGold[fam]) f *= 1 + fx.famGold[fam];
  if (P.chainsBeat > 0 && fx.chainGold > 0) f *= 1 + fx.chainGold * Math.min(8, P.chainsBeat);
  if (P.surgeLeft > 0) f *= ABILITIES.surge.goldMult;
  if (P.echoLeft > 0) f *= 2;
  if (fx.combo > 0) { // a bigger Combo step than the base
    const steps = clamp(run.state.combo - 1, 0, ENGINE.comboCap);
    f *= (1 + (ENGINE.comboStep + fx.combo) * steps) / (1 + ENGINE.comboStep * steps);
  }
  return f;
}

// A relic item rose and was grabbed: it becomes a named relic.
export function playRelicItem(run, out) {
  const P = run.play;
  if (!P.opts.relics) return;
  const relic = rollRelic(P.rng, biomeFor(run, run.state.depth).id, 0);
  P.relics.push(relic.id);
  out.push(ev.relicFound(relic.id, relic.name, relic.rarity, relic.biome, 'item'));
}

// A danger got through. Returns the strain it adds (0 when a ward ate it).
export function playHazard(run, rec, delta, out) {
  const P = run.play, fx = P.fx, st = run.state;
  onEncounterHazardHit(run);
  if (fx.ward > P.wardUsed) { P.wardUsed++; return 0; }
  const d = delta * Math.max(0.2, 1 - fx.hazard);
  if (fx.hazGold > 0) {
    const gold = Math.max(1, Math.round(fx.hazGold * TIER_VALUE[1] * run.goldMult * depthBonus(st.depth)));
    st.gold += gold; out.push(ev.collect(rec.lane, { kind: 'relic', tier: 1, value: gold }, gold, st.combo, 0, 0));
  }
  P.stats.hazStrain += d; P.stats.hazHits++;
  return d;
}

// Second Wind: true when the rope was saved this step.
export function playSecondWind(run, out) {
  const P = run.play, st = run.state;
  if (P.fx.second <= P.secondUsed) return false;
  P.secondUsed++;
  st.strain = FAIRNESS.secondWindStrain * st.maxStrain;
  out.push(ev.secondWind(Math.max(0, P.fx.second - P.secondUsed)));
  return true;
}

// One step can never snap a rope that was healthy (guardians and cave-ins included).
export function playNoJump(run, before) {
  const P = run.play, st = run.state;
  if (!P.opts.noJump) return;
  if (before < FAIRNESS.noJumpFrom * st.maxStrain && st.strain > FAIRNESS.noJumpCap * st.maxStrain) st.strain = FAIRNESS.noJumpCap * st.maxStrain;
}

// End of the step: did a guardian fall, is an offer due?
export function playEnd(run, out) {
  const P = run.play, st = run.state;
  resolveGuardian(run, out);
  if (st.status !== 'running' || P.offer) return;
  let kind = '';
  if (P.wantOffer) { kind = P.wantOffer; P.wantOffer = ''; }
  else if (P.opts.boons && st.depth >= P.nextOfferDepth && P.stats.picks < OFFER.maxPerRun) {
    const a = P.enc && P.enc.active;
    if ((a && a.on) || guardianBusy(run, 0) || (P.gd && P.gd.active)) return; // wait for a calmer step
    kind = 'depth';
  }
  if (!kind) return;
  const offer = kind === 'merchant' ? makeMerchantOffer(run) : makeBoonOffer(run, kind === 'guardian' ? OFFER.guardianWeights : null, kind);
  if (kind !== 'merchant') P.nextOfferDepth = nextOfferAfter(st.depth);
  if (!offer) { if (kind === 'merchant' && P.enc) P.enc.active = null; return; }
  P.offer = offer; P.stats.offers++;
  st.status = 'choosing';
  out.push(ev.boonOffer(offer));
}
