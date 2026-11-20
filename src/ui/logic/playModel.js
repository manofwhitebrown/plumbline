// Plain-data helpers for the active-play UI (boon picker, skill buttons, banners). No page access, so it is easy to test.
import { TAG_NAMES, RARITIES } from '../../data/boons.js';
import { ENCOUNTERS } from '../../data/events.js';

export const SKILL_ORDER = ['brace', 'surge', 'flare'];

export function cardModel(opt) {
  const o = opt && typeof opt === 'object' ? opt : {};
  const power = Number(o.power);
  const r = RARITIES[o.rarity] || RARITIES.common;
  return {
    id: String(o.id || ''), name: String(o.name || 'Boon'), rarity: r.id, rarityLabel: r.name, color: r.color,
    tags: (Array.isArray(o.tags) ? o.tags : []).map((t) => ({ id: t, label: TAG_NAMES[t] || String(t) })),
    desc: String(o.desc || ''),
    boost: Number.isFinite(power) && power > 1.001 ? '+' + Math.round((power - 1) * 100) + '% for your rig' : '',
    cost: Number(o.cost) > 0 ? Math.floor(Number(o.cost)) : 0,
  };
}

// One skill button. `s` is an entry of view.play.skills.
export function skillModel(s) {
  const k = s && typeof s === 'object' ? s : {};
  const total = Number(k.total) || 0, cd = Number(k.cd) || 0;
  const ready = !!k.ready;
  const fill = ready ? 1 : total > 0 ? Math.max(0, Math.min(1, 1 - cd / total)) : 0;
  return {
    id: String(k.id || ''), name: String(k.name || ''), key: String(k.key || ''), ready, fill,
    charges: Number(k.charges) || 0, active: Number(k.left) > 0,
    label: (Number(k.max) > 1 && ready) ? 'x' + (Number(k.charges) || 0) : '',
    aria: String(k.name || '') + (ready ? ', ready' : ', recharging') + '. ' + String(k.desc || ''),
  };
}

// Words for the banner. Returns null for events that do not need one.
export function bannerFor(e) {
  if (!e || typeof e.t !== 'string') return null;
  switch (e.t) {
    case 'ENCOUNTER_WARN': return { kind: 'warn', text: String(e.text || e.name || 'Look out!'), ms: 2600 };
    case 'ENCOUNTER_END': {
      const d = ENCOUNTERS[e.id];
      return e.success && d && d.done ? { kind: 'good', text: d.done, ms: 1800 } : null;
    }
    case 'GUARDIAN_WARN': return { kind: 'warn', text: String(e.name || 'Guardian') + '! ' + String(e.intro || ''), ms: 3000 };
    case 'GUARDIAN_START': return { kind: 'warn', text: String(e.tip || 'Hit the marked gems.'), ms: 3000 };
    case 'GUARDIAN_DOWN': return e.won ? { kind: 'good', text: String(e.name || 'Guardian') + ' falls!', ms: 2600 } : { kind: 'info', text: String(e.name || 'Guardian') + ' holds.', ms: 2200 };
    case 'BOON_SYNERGY': return { kind: 'good', text: String(e.name) + ': ' + String(e.desc || ''), ms: 3000 };
    case 'SECOND_WIND': return { kind: 'good', text: 'Second Wind! The rope held.', ms: 2400 };
    case 'RELIC_FOUND': return { kind: 'good', text: 'Relic found: ' + String(e.name || ''), ms: 2600 };
    default: return null;
  }
}

// Guardian bar: 0..1 of health left.
export function guardianFrac(g) {
  if (!g || !(Number(g.maxHp) > 0)) return 0;
  return Math.max(0, Math.min(1, Number(g.hp) / Number(g.maxHp)));
}

// Seconds left on the picker (never negative).
export function secondsLeft(startMs, nowMs, seconds) {
  return Math.max(0, Number(seconds) - (nowMs - startMs) / 1000);
}
