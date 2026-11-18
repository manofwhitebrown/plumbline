// Turns the run view into plain HUD values. Pure: no page, no timers. Bad input gives safe values.
import { fmt, fmtDepth } from '../../core/format.js';
import { dangerLevel, strainFraction } from './danger.js';

const MAX_GOAL_PILLS = 3;
const GOAL_TEXT_MAX = 28;

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function cut(text, max) {
  const s = typeof text === 'string' ? text.trim() : '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function nice(id) {
  const s = typeof id === 'string' ? id : '';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Clay';
}

// "Keep it all · at risk 1.2K". At risk 0 says only "Keep it all".
export function haulSubline(risk) {
  const at = Math.max(0, num(risk && risk.goldAtRisk));
  return at > 0 ? 'Keep it all · at risk ' + fmt(at) : 'Keep it all';
}

export function goalPills(goals) {
  if (!Array.isArray(goals)) return [];
  const out = [];
  for (let i = 0; i < goals.length && out.length < MAX_GOAL_PILLS; i++) {
    const g = goals[i];
    if (!g || typeof g !== 'object') continue;
    const done = !!g.done;
    const p = done ? 1 : Math.min(1, Math.max(0, num(g.progress01)));
    out.push({ text: cut(g.text, GOAL_TEXT_MAX), progress01: p, done });
  }
  return out;
}

// level: 0 calm, 1 warm, 2 danger (pulse), 3 critical (shake)
export function hudModel(view) {
  const v = view && typeof view === 'object' ? view : {};
  const max = Math.max(1, num(v.maxStrain, 100));
  const strain = Math.max(0, num(v.strain));
  const level = dangerLevel(strain, max);
  const combo = Math.max(0, Math.floor(num(v.combo)));
  const biome = v.biome && typeof v.biome === 'object' ? v.biome : {};
  return {
    depthText: fmtDepth(Math.max(0, num(v.depth))),
    goldText: fmt(Math.max(0, num(v.gold))),
    biomeName: cut(typeof biome.name === 'string' && biome.name ? biome.name : nice(v.biomeId), 12),
    strain01: strainFraction(strain, max),
    level,
    pulse: level >= 2,
    shake: level >= 3,
    edge: level >= 3 ? 2 : level >= 2 ? 1 : 0,
    haulSub: haulSubline(v.risk),
    combo,
    comboText: 'x' + fmt(combo),
    comboShow: combo >= 2,
    goals: goalPills(v.goals),
    running: v.status === 'running',
  };
}

// How much gold arrived since the last view. 0 when it did not grow or the numbers are bad.
export function goldDelta(prev, next) {
  const a = num(prev), b = num(next);
  const d = Math.floor(b - a);
  return d > 0 && Number.isFinite(d) ? d : 0;
}

export function popText(n) {
  return '+' + fmt(Math.max(0, num(n)));
}
