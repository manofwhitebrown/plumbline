// Tap skills. Cooldowns and charges live in the run (`P.abil`). Time is counted in steps, so replays stay exact.
import { ABILITIES, ABILITY_IDS, MAX_COOLDOWN_CUT } from '../../data/abilities.js';
import { ev } from '../events.js';
import { peekRows } from '../spawn.js';

export function initAbilities(P, opts) {
  P.abil = {};
  P.braceLeft = 0; P.surgeLeft = 0;
  const list = Array.isArray(opts.abilities) ? opts.abilities : [];
  for (const id of list) unlock(P, id);
  if (P.abil.brace && opts.freeBrace > 0) P.abil.brace.charges += Math.min(2, Math.floor(opts.freeBrace));
}

export function unlock(P, id) {
  const def = ABILITIES[id];
  if (!def || P.abil[id]) return false;
  P.abil[id] = { id, charges: def.charges, max: def.charges, cd: 0, total: 0 };
  return true;
}

function cdSteps(P, def) {
  const cut = Math.min(MAX_COOLDOWN_CUT, P.fx.cd || 0);
  return Math.max(6, Math.round(def.cooldownSteps * (1 - cut)));
}

// Boons can add charges and unlock Flare. Called after every pick.
export function syncAbilities(P) {
  if (P.fx.flare > 0) unlock(P, 'flare');
  const extra = { brace: P.fx.braceCharges || 0, surge: P.fx.surgeCharges || 0 };
  for (const id of ABILITY_IDS) {
    const a = P.abil[id];
    if (!a) continue;
    const max = ABILITIES[id].charges + (extra[id] || 0);
    if (max > a.max) { a.charges += max - a.max; a.max = max; }
  }
}

// Start of every step: effects wear off, cooldowns count down.
export function tickAbilities(run, out) {
  const P = run.play;
  if (P.braceLeft > 0) { P.braceLeft--; if (P.braceLeft === 0 && out) out.push(ev.ability('brace', 'end')); }
  if (P.surgeLeft > 0) { P.surgeLeft--; if (P.surgeLeft === 0 && out) out.push(ev.ability('surge', 'end')); }
  for (const id of ABILITY_IDS) {
    const a = P.abil[id];
    if (!a || a.charges >= a.max) continue;
    if (a.cd > 0) a.cd--;
    if (a.cd <= 0) {
      a.charges++;
      if (a.charges < a.max) { a.total = cdSteps(P, ABILITIES[id]); a.cd = a.total; } else { a.cd = 0; a.total = 0; }
      if (out) out.push(ev.ability(id, 'ready'));
    }
  }
}

// Why can't this skill be used right now? Returns '' when it can.
export function abilityCheck(run, id) {
  const P = run && run.play, st = run && run.state;
  if (!P || !st) return 'off';
  if (st.status !== 'running') return 'paused';
  const a = P.abil[id], def = ABILITIES[id];
  if (!a || !def) return 'locked';
  if (a.charges <= 0) return 'cooling';
  if (id === 'surge' && st.strain + def.strainPct * st.maxStrain >= st.maxStrain * 0.99) return 'too risky';
  if (id === 'flare' && flareRow(run) < 0) return 'nothing ahead';
  return '';
}

// The first upcoming row (1 = next step) that holds a danger, or -1.
function flareRow(run) {
  const rows = peekRows(run, ABILITIES.flare.lookAhead);
  for (let k = 0; k < rows.length; k++) {
    for (const it of rows[k]) if (it.kind === 'hazard' && !run.play.noClear[run.state.beat + k + 1]) return k + 1;
  }
  return -1;
}

export function useAbility(run, id) {
  if (abilityCheck(run, id)) return [];
  const P = run.play, st = run.state, a = P.abil[id], def = ABILITIES[id];
  a.charges--;
  if (a.charges < a.max && a.cd <= 0) { a.total = cdSteps(P, def); a.cd = a.total; }
  const out = [];
  P.stats.uses[id] = (P.stats.uses[id] || 0) + 1;
  if (id === 'brace') {
    const d = def.strainPct * st.maxStrain;
    st.strain = Math.max(0, st.strain + d);
    P.braceLeft = def.effectSteps;
    out.push(ev.ability('brace', 'used', { strain: d }));
    out.push(ev.strain(st.strain, st.maxStrain, d));
    if (P.enc && P.enc.active && P.enc.active.id === 'rope_weevil' && P.enc.active.on) {
      out.push(ev.encounterEnd('rope_weevil', true));
      P.enc.active = null;
      P.enc.next = st.beat + P.encRules.gapSteps[0];
      P.stats.enc.rope_weevil_scared = (P.stats.enc.rope_weevil_scared || 0) + 1;
    }
  } else if (id === 'surge') {
    const d = def.strainPct * st.maxStrain;
    st.strain += d;
    P.surgeLeft = def.effectSteps;
    P.stats.surgeStrain += d;
    out.push(ev.ability('surge', 'used', { strain: d }));
    out.push(ev.strain(st.strain, st.maxStrain, d));
  } else if (id === 'flare') {
    const k = flareRow(run);
    const rows = peekRows(run, ABILITIES.flare.lookAhead);
    const mask = [];
    rows[k - 1].forEach((it, lane) => { if (it.kind === 'hazard') mask.push(lane); });
    P.clear[st.beat + k] = mask;
    out.push(ev.ability('flare', 'used', { row: k, cleared: mask.length, lanes: mask }));
  }
  P.recompute(run, true);
  return out;
}

export function abilityList(run) {
  const P = run.play, out = [];
  for (const id of ABILITY_IDS) {
    const a = P.abil[id];
    if (!a) continue;
    const def = ABILITIES[id];
    out.push({
      id, name: def.name, key: def.key, desc: def.desc, charges: a.charges, max: a.max, cd: a.cd, total: a.total,
      ready: a.charges > 0, left: id === 'brace' ? P.braceLeft : id === 'surge' ? P.surgeLeft : 0, effect: def.effectSteps || 0,
    });
  }
  return out;
}
