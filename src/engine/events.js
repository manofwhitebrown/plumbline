// Event constructors and a checker. Events are plain objects: { t:'NAME', ... }.
// Every event type and its fields are listed once, in SCHEMA. Tests use validateEvent().
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isStr = (x) => typeof x === 'string';
const isCell = (x) => x && isNum(x.r) && isNum(x.c);
const isItem = (x) => x && typeof x.kind === 'string' && isNum(x.tier) && isNum(x.value);
const isItems = (x) => Array.isArray(x) && x.every(isItem);

// field name -> check function
export const SCHEMA = {
  RUN_START: { seed: isNum },
  BEAT: { i: isNum, depth: isNum, speed: isNum },
  SPAWN: { i: isNum, lanes: isItems },
  FIRE: { r: isNum, c: isNum, partId: (x) => typeof x === 'string' },
  CHAIN: { from: isCell, to: isCell },
  COLLECT: { lane: isNum, item: isItem, gold: isNum, combo: isNum, r: isNum, c: isNum },
  MISS: { lane: isNum, item: isItem },
  HAZARD: { lane: isNum, hazard: (x) => typeof x === 'string', absorbedBy: (x) => x === null || isCell(x), strainDelta: isNum },
  STRAIN: { value: isNum, max: isNum, delta: isNum },
  BIOME: { id: (x) => typeof x === 'string', depth: isNum },
  MILESTONE: { depth: isNum },
  SNAP: { goldLost: isNum, goldKept: isNum },
  HAUL: { gold: isNum, depth: isNum },
  RECORD: { depth: isNum },
  // [HOOK-1] play layer (see docs/manager/CONTRACT_ADDENDUM.md). Old listeners ignore these.
  ABILITY: { id: isStr, phase: isStr },
  BOON_OFFER: { kind: isStr, options: Array.isArray, seconds: isNum, depth: isNum },
  BOON_PICK: { id: isStr, name: isStr, rarity: isStr },
  BOON_SYNERGY: { tag: isStr, name: isStr },
  SECOND_WIND: { left: isNum },
  ENCOUNTER_WARN: { id: isStr, name: isStr, steps: isNum },
  ENCOUNTER_START: { id: isStr, name: isStr },
  ENCOUNTER_END: { id: isStr, success: (x) => typeof x === 'boolean' },
  RELIC_FOUND: { id: isStr, name: isStr, rarity: isStr, biome: isStr },
  GUARDIAN_WARN: { id: isStr, name: isStr, steps: isNum },
  GUARDIAN_START: { id: isStr, name: isStr, hp: isNum, maxHp: isNum },
  GUARDIAN_HIT: { id: isStr, dmg: isNum, hp: isNum, maxHp: isNum },
  GUARDIAN_DOWN: { id: isStr, name: isStr, won: (x) => typeof x === 'boolean' },
};

// Returns null when the event is fine, or a short text saying what is wrong.
export function validateEvent(ev) {
  if (!ev || typeof ev !== 'object') return 'not an object';
  const spec = SCHEMA[ev.t];
  if (!spec) return 'unknown event ' + ev.t;
  for (const key of Object.keys(spec)) {
    if (!spec[key](ev[key])) return ev.t + '.' + key + ' is bad';
  }
  return null;
}

// A clean copy of an item for an event (so later changes cannot rewrite history).
export function snapItem(it) {
  const o = { kind: it.kind, tier: it.tier, value: it.value };
  if (it.hazard) o.hazard = it.hazard;
  if (it.weak) o.weak = true;   // [HOOK-1] guardian weak point
  if (it.mark) o.mark = true;   // [HOOK-1] treasure alcove gem
  return o;
}

export const ev = {
  runStart: (seed) => ({ t: 'RUN_START', seed }),
  beat: (i, depth, speed) => ({ t: 'BEAT', i, depth, speed }),
  spawn: (i, items) => ({ t: 'SPAWN', i, lanes: items.map(snapItem) }),
  fire: (r, c, partId) => ({ t: 'FIRE', r, c, partId }),
  chain: (fr, fc, tr, tc) => ({ t: 'CHAIN', from: { r: fr, c: fc }, to: { r: tr, c: tc } }),
  collect: (lane, item, gold, combo, r, c) => ({ t: 'COLLECT', lane, item: snapItem(item), gold, combo, r, c }),
  miss: (lane, item) => ({ t: 'MISS', lane, item: snapItem(item) }),
  hazard: (lane, hazard, by, strainDelta) => ({ t: 'HAZARD', lane, hazard, absorbedBy: by ? { r: by.r, c: by.c } : null, strainDelta }),
  strain: (value, max, delta) => ({ t: 'STRAIN', value, max, delta }),
  biome: (id, depth) => ({ t: 'BIOME', id, depth }),
  milestone: (depth) => ({ t: 'MILESTONE', depth }),
  snap: (goldLost, goldKept) => ({ t: 'SNAP', goldLost, goldKept }),
  haul: (gold, depth) => ({ t: 'HAUL', gold, depth }),
  // [HOOK-1] play layer
  ability: (id, phase, extra) => Object.assign({ t: 'ABILITY', id, phase }, extra || {}),
  boonOffer: (o) => ({ t: 'BOON_OFFER', kind: o.kind, source: o.source, options: o.options, seconds: o.seconds, depth: o.depth, mid: o.mid, cost: o.cost || 0 }),
  boonPick: (id, name, rarity, tags, auto, via) => ({ t: 'BOON_PICK', id, name, rarity, tags: tags || [], auto: !!auto, via: via || 'pick' }),
  boonSynergy: (tag, name, desc, tagName) => ({ t: 'BOON_SYNERGY', tag, name, desc, tagName }),
  secondWind: (left) => ({ t: 'SECOND_WIND', left }),
  encounterWarn: (id, name, text, steps) => ({ t: 'ENCOUNTER_WARN', id, name, text, steps }),
  encounterStart: (id, name) => ({ t: 'ENCOUNTER_START', id, name }),
  encounterEnd: (id, success) => ({ t: 'ENCOUNTER_END', id, success: !!success }),
  relicFound: (id, name, rarity, biome, source) => ({ t: 'RELIC_FOUND', id, name, rarity, biome, source }),
  guardianWarn: (id, name, steps, depth, intro) => ({ t: 'GUARDIAN_WARN', id, name, steps, depth, intro }),
  guardianStart: (id, name, hp, maxHp, steps, tip) => ({ t: 'GUARDIAN_START', id, name, hp, maxHp, steps, tip }),
  guardianHit: (id, dmg, hp, maxHp, lane, weak) => ({ t: 'GUARDIAN_HIT', id, dmg, hp, maxHp, lane, weak: !!weak }),
  guardianDown: (id, name, won, reward, damage) => ({ t: 'GUARDIAN_DOWN', id, name, won: !!won, reward: reward || null, damage: damage || 0 }),
};
