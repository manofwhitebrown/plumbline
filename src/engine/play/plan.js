// Row plans: encounters and guardians write what a future row will hold. spawnRow reads the plan, so peekNext matches.
import { TIER_VALUE } from '../../data/loot.js';
import { biomeFor } from '../spawn.js';
import { FAIRNESS } from '../../data/play.js';

export function money(tier, def, factor = 1) {
  const t = Math.min(6, Math.max(1, Math.floor(tier)));
  return Math.round(TIER_VALUE[t] * factor * (def.goldFactor || 1) * 100) / 100;
}

// The best gem level this Biome makes.
export function bestTier(def) {
  let t = 1;
  for (let i = 0; i < 6; i++) if ((def.tierWeights[i] || 0) > 0) t = i + 1;
  return t;
}

export function biomeAt(run, depth) { return biomeFor(run, depth); }

// Columns that some collector can reach (plus the next column with Wide Grip). Never empty.
export function coveredLanes(run) {
  const P = run.play, wide = P.fx.wide > 0;
  if (P.cover && P.coverWide === wide) return P.cover;
  const set = new Set();
  for (let i = 0; i < run.parts.length; i++) {
    const def = run.parts[i];
    if (!def || !(def.family === 'collector' || def.collects)) continue;
    const c = i % run.cols;
    const reach = Array.isArray(def.reach) ? def.reach : [0];
    for (const d of reach) { const l = c + d; if (l >= 0 && l < run.cols) set.add(l); }
    if (wide) { if (c - 1 >= 0) set.add(c - 1); if (c + 1 < run.cols) set.add(c + 1); }
  }
  let list = Array.from(set).sort((a, b) => a - b);
  if (!list.length) list = Array.from({ length: run.cols }, (_, i) => i);
  P.cover = list; P.coverWide = wide;
  return list;
}

export function newPlanRow(cols, strip) {
  return { cells: new Array(cols).fill(null), strip: !!strip, noClear: false };
}

// Write the planned row into the pooled `row` items. Called from spawnRow.
export function applyPlan(run, beat, row) {
  const P = run.play;
  const pr = P.plan[beat];
  if (pr) {
    for (let lane = 0; lane < row.length; lane++) {
      const spec = pr.cells[lane], it = row[lane];
      if (spec) {
        it.kind = spec.k; it.tier = spec.tier || 1; it.value = spec.value || 0; it.hazard = spec.hazard || '';
        it.collected = false; it.drifts = false; it.weak = !!spec.weak; it.mark = !!spec.mark;
      } else if (pr.strip && it.kind === 'hazard') {
        it.kind = 'empty'; it.value = 0; it.hazard = '';
      }
    }
  }
  const mask = P.clear[beat];
  if (mask && !(pr && pr.noClear)) {
    for (const lane of mask) {
      const it = row[lane];
      if (it && it.kind === 'hazard') { it.kind = 'empty'; it.value = 0; it.hazard = ''; }
    }
  }
  limitStreak(run, beat, row, !!pr);
}

// Fairness: early on, the same column never gets a third danger in a row.
// Real rows write the counts (P.hz). A peek only reads a copy (P.hzPeek), so looking ahead never changes the drop.
export function limitStreak(run, beat, row, planned) {
  const P = run.play, max = FAIRNESS.maxDangerStreak;
  if (!P || !(max > 0)) return;
  const real = row !== run.peekRow;
  const n = row.length;
  let cnt;
  if (real) {
    if (P.hz && P.hzBeat === beat && P.hzPrev) P.hz = P.hzPrev.slice();      // the same step built again (after a pick): redo from before it
    else if (!P.hz || P.hzBeat !== beat - 1) P.hz = new Array(n).fill(0);    // first row, or a gap: start clean
    P.hzPrev = P.hz.slice();
    cnt = P.hz;
  } else {
    if (!P.hz || beat <= P.hzBeat) return;
    if (!P.hzPeek || P.hzPeekBeat !== beat - 1) {
      if (beat - 1 !== P.hzBeat) { P.hzPeek = null; return; } // not the very next row: cannot know the counts
      P.hzPeek = P.hz.slice();
    }
    cnt = P.hzPeek;
  }
  const active = run.state.depth < FAIRNESS.streakUntilDepth;
  for (let lane = 0; lane < n; lane++) {
    const it = row[lane];
    if (it.kind === 'hazard') {
      if (active && !planned && cnt[lane] >= max) { it.kind = 'empty'; it.value = 0; it.hazard = ''; it.drifts = false; cnt[lane] = 0; }
      else cnt[lane]++;
    } else cnt[lane] = 0;
  }
  if (real) { P.hzBeat = beat; P.hzPeek = null; } else P.hzPeekBeat = beat;
}
