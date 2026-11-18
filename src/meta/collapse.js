// Collapse (prestige). Resets gold, crew, parts and gold upgrades. Keeps Core Dust and the rest.
import { COLLAPSE, UPGRADES } from '../data/upgrades.js';
import { s, changed } from './state.js';
import { money, count } from './safe.js';
import { level } from './upgrades.js';
import { crewIds } from './crew.js';
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';

let busy = false;

export function available() {
  const st = s();
  return st.bestDepth >= COLLAPSE.minBestDepth && st.goldThisCollapse >= COLLAPSE.minGold;
}

// Core Dust you would get right now (0 if not available).
export function gain() {
  if (!available()) return 0;
  const st = s();
  const raw = Math.sqrt(st.goldThisCollapse / COLLAPSE.goldDivisor)
    * (1 + st.bestDepth / COLLAPSE.depthDivisor)
    * (1 + 0.1 * level('cd_dust'));
  return Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 0));
}

export function preview() {
  const st = s();
  const g = gain();
  const keepCrew = 2 * level('cd_crew');
  return {
    available: available(),
    coreDustGain: g,
    totalAfter: money(st.coreDustTotal + g),
    goldBonusAfter: 1 + 0.1 * (st.coreDustTotal + g),
    needDepth: COLLAPSE.minBestDepth, needGold: COLLAPSE.minGold,
    resets: ['Gold', 'Crew', 'Parts', 'Gold upgrades'],
    keeps: ['Core Dust', 'Shards', 'Codex', 'Best Depth', 'Shard and Core Dust upgrades'],
    keepsCrewEach: keepCrew,
    startsWith: level('cd_start') > 0 ? ['Hook', 'Magnet'] : ['Hook'],
  };
}

// All or nothing. A second press right after does nothing because it is no longer available.
export function doCollapse() {
  if (busy) return { ok: false, error: 'Already collapsing' };
  busy = true;
  try {
    if (!available()) return { ok: false, error: 'Collapse is not ready yet' };
    const st = s();
    const g = gain();
    const keepEach = 2 * level('cd_crew');
    // Build the new values first. Nothing changes until every step worked.
    const nextCrew = {};
    for (const id of crewIds()) {
      const keep = Math.min(count(st.crew[id]), keepEach);
      if (keep > 0) nextCrew[id] = keep;
    }
    const nextParts = { hook: 1 };
    if (level('cd_start') > 0) nextParts.magnet = 1;
    const nextUpgrades = { ...st.upgrades };
    for (const u of UPGRADES) if (u.currency === 'gold') delete nextUpgrades[u.id];
    const nextDust = money(st.coreDust + g);
    const nextTotal = money(st.coreDustTotal + g);

    st.gold = 0;
    st.goldThisCollapse = 0;
    st.crew = nextCrew;
    st.managers = {};
    st.parts = nextParts;
    st.upgrades = nextUpgrades;
    st.offlinePending = null;
    st.coreDust = nextDust;
    st.coreDustTotal = nextTotal;
    st.stats.collapses = money(st.stats.collapses + 1);
    changed('collapse');
    try { bus.emit('meta:collapsed', { coreDustGain: g }); } catch (e) { log.warn('collapse emit failed', e && e.message); }
    return { ok: true, coreDustGain: g };
  } catch (e) {
    log.error('collapse failed', e && e.message);
    return { ok: false, error: 'Collapse could not finish' };
  } finally {
    busy = false;
  }
}

// Cheat helper: make Collapse ready.
export function makeReady() {
  const st = s();
  st.bestDepth = Math.max(st.bestDepth, COLLAPSE.minBestDepth);
  st.goldThisCollapse = Math.max(st.goldThisCollapse, COLLAPSE.minGold);
  changed('collapse');
}
