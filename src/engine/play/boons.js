// Boon offers and picks. All randomness comes from the run's play stream (`P.rng`) in a fixed order:
// exactly one draw for each card offered, and one for a Merchant boon.
import { BOONS, RARITIES, OFFER, boonById, SYNERGIES, TAG_NAMES } from '../../data/boons.js';
import { ENCOUNTERS } from '../../data/events.js';
import { ev } from '../events.js';
import { computeFx, strength } from './fx.js';

function cardOf(b, aff) {
  return { id: b.id, name: b.name, rarity: b.rarity, tags: b.tags.slice(), desc: b.desc, power: Math.round(strength(b, aff) * 100) / 100 };
}

function pool(P, depth) {
  const out = [];
  for (const b of BOONS) {
    if (P.boons.indexOf(b.id) >= 0) continue;
    if (b.rarity === 'legendary' && depth < OFFER.legendaryFrom) continue;
    if (b.fx.flare && P.abil.flare) continue;           // already have Flare
    out.push(b);
  }
  return out;
}

// weights: { common, rare, legendary } (shares). Each boon weighs its rarity share / how many of that rarity are left,
// times a bonus for each part in the rig that fits one of its tags.
function weigh(P, list, shares) {
  const count = { common: 0, rare: 0, legendary: 0 };
  for (const b of list) count[b.rarity]++;
  return list.map((b) => {
    const share = shares[b.rarity] || 0;
    let best = 0;
    for (const t of b.tags) best = Math.max(best, P.aff[t] || 0);
    const bias = 1 + OFFER.affinityBias * Math.min(3, best);
    return [b, count[b.rarity] ? (share / count[b.rarity]) * bias : 0];
  });
}

export function rarityShares(depth, override) {
  if (override) return override;
  const boost = OFFER.rareBoostPerCentury * Math.floor(Math.max(0, depth) / 100);
  return {
    common: Math.max(20, RARITIES.common.weight - boost * 100),
    rare: RARITIES.rare.weight + boost * 100 * 0.8,
    legendary: depth >= OFFER.legendaryFrom ? RARITIES.legendary.weight + boost * 100 * 0.2 : 0,
  };
}

// Make an offer of up to 3 boon cards. Returns null when there is nothing to offer.
export function makeBoonOffer(run, shares, source) {
  const P = run.play, depth = run.state.depth;
  let list = pool(P, depth);
  const s = rarityShares(depth, shares);
  const options = [];
  for (let i = 0; i < OFFER.choices && list.length; i++) {
    const pairs = weigh(P, list, s);
    let total = 0;
    for (const p of pairs) total += p[1];
    const pick = P.rng.weighted(total > 0 ? pairs : pairs.map((p) => [p[0], 1]));
    if (!pick) break;
    options.push(cardOf(pick, P.aff));
    list = list.filter((b) => b.id !== pick.id);
  }
  if (!options.length) return null;
  return { kind: 'boon', source: source || 'depth', options, depth: Math.floor(depth), seconds: OFFER.seconds, mid: Math.min(1, options.length - 1) };
}

export function makeMerchantOffer(run) {
  const P = run.play, M = ENCOUNTERS.merchant, st = run.state;
  const cost = Math.max(1, Math.floor(st.gold * M.costPct));
  const options = [
    { id: 'merchant_boon', name: 'Buy a boon', rarity: 'rare', tags: [], desc: 'A Rare or better boon.', cost },
    { id: 'merchant_relief', name: 'Ease the rope', rarity: 'common', tags: [], desc: 'Takes ' + Math.round(M.reliefPct * 100) + '% off the strain.', cost },
    { id: 'merchant_skip', name: 'No thanks', rarity: 'common', tags: [], desc: 'Keep your gold.', cost: 0 },
  ];
  return { kind: 'merchant', source: 'merchant', options, depth: Math.floor(st.depth), seconds: OFFER.seconds, mid: 1, cost };
}

// Put a boon into the run. Returns events.
export function addBoon(run, id, extra) {
  const P = run.play, b = boonById(id);
  if (!b || P.boons.indexOf(id) >= 0) return [];
  const before = P.fx.synergies.slice();
  P.boons.push(id);
  P.recompute(run);
  const out = [ev.boonPick(b.id, b.name, b.rarity, b.tags, !!(extra && extra.auto), (extra && extra.via) || 'pick')];
  for (const t of P.fx.synergies) {
    if (before.indexOf(t) < 0 && SYNERGIES[t]) out.push(ev.boonSynergy(t, SYNERGIES[t].name, SYNERGIES[t].desc, TAG_NAMES[t] || t));
  }
  return out;
}

// Draw a Rare-or-better boon for the Merchant (one rng draw).
function merchantBoon(run) {
  const P = run.play, M = ENCOUNTERS.merchant;
  const list = pool(P, run.state.depth);
  if (!list.length) return null;
  const pairs = weigh(P, list, M.boonRarity);
  let total = 0;
  for (const p of pairs) total += p[1];
  return P.rng.weighted(total > 0 ? pairs : list.map((b) => [b, 1]));
}

// Resolve the open offer. id may be an option id, or null/'auto' for the middle card.
export function resolveOffer(run, id, auto) {
  const P = run.play, st = run.state, offer = P.offer;
  if (!offer || st.status !== 'choosing') return [];
  let opt = offer.options.find((o) => o.id === id);
  if (!opt) {
    if (id !== null && id !== undefined && id !== 'auto') return [];
    opt = offer.options[offer.mid] || offer.options[0];
    auto = true;
  }
  const out = [];
  if (offer.kind === 'merchant') {
    const M = ENCOUNTERS.merchant;
    if (opt.id === 'merchant_skip' || st.gold < opt.cost) {
      out.push(ev.encounterEnd('merchant', false));
    } else {
      st.gold -= opt.cost;
      if (opt.id === 'merchant_boon') {
        const b = merchantBoon(run);
        if (b) out.push(...addBoon(run, b.id, { auto, via: 'merchant' }));
      } else {
        const rel = M.reliefPct * st.maxStrain;
        st.strain = Math.max(0, st.strain - rel);
        out.push(ev.strain(st.strain, st.maxStrain, -rel));
      }
      out.push(ev.encounterEnd('merchant', true));
    }
    if (P.enc) P.enc.active = null;
  } else {
    out.push(...addBoon(run, opt.id, { auto, via: offer.source === 'guardian' ? 'guardian' : 'pick' }));
    P.stats.picks++;
  }
  P.offer = null;
  st.status = 'running';
  return out;
}

// Headless choice: a simple score. Noise comes from a hash of the seed and the boon, not from the rng.
function hash01(seed, id) {
  let h = seed ^ 0x9e3779b9;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function scoreBoon(run, card) {
  const P = run.play, b = boonById(card.id);
  if (!b) return -1;
  const st = run.state;
  const rank = b.rarity === 'legendary' ? 3 : b.rarity === 'rare' ? 2 : 1;
  const tight = st.strain / Math.max(1, st.maxStrain);
  let s = rank + (card.power - 1) * 3 + hash01(run.seed, b.id) * 1.4;
  const fx = b.fx;
  if (tight > 0.5 && (fx.strain > 0 || fx.second || fx.ward || fx.braceCharges || fx.maxStrain)) s += 0.8;
  if (fx.gold || fx.gem || fx.chainGold || fx.famGold) s += 0.5;
  if (P.boons.length === 0 && fx.flare && !P.abil.flare) s -= 0.3;
  return s;
}

export function autoPickId(run) {
  const P = run.play, offer = P && P.offer;
  if (!offer) return null;
  if (offer.kind === 'merchant') {
    const tight = run.state.strain / Math.max(1, run.state.maxStrain);
    return tight > 0.55 ? 'merchant_relief' : 'merchant_boon';
  }
  let best = null, bs = -1e9;
  for (const o of offer.options) { const s = scoreBoon(run, o); if (s > bs) { bs = s; best = o.id; } }
  return best;
}

export { computeFx };
