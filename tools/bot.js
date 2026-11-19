// QA bot. Plays a whole progression with no screen, using the real meta, engine and suggest modules.
// Run: node tools/bot.js [--style=70|85|never|all] [--hours=6] [--quiet]
// Exit code 0 = all good, 1 = at least one problem (printed as FAIL lines).
import { resetAll } from '../src/core/save.js';
import { setTimeSource } from '../src/meta/time.js';
import { meta } from '../src/meta/index.js';
import * as runhooks from '../src/meta/runhooks.js';
import { simulateRun } from '../src/engine/index.js';
import { ENGINE } from '../src/data/engine.js';
import { computePayout } from '../src/run/payout.js';
import { suggest } from '../src/tutorial/suggest.js';
import { allParts, allCombos } from '../src/engine/parts/index.js';

export const STYLES = { 70: 0.7, 85: 0.85, never: null };
const START = 1_700_000_000_000;
const DROP_PAUSE_S = 3;          // time the player spends on the results and rig screens
const STUCK_S = 20 * 60;         // 20 simulated minutes without any way forward
const DEPTH_MARKS = [100, 250, 500, 1000];

function bad(x) { return typeof x === 'number' && (!Number.isFinite(x) || x < 0); }

// Plays one style. Returns { style, problems, timeline, ... }. Never throws.
export function playBot(style = '70', opts = {}) {
  const hours = Number.isFinite(opts.hours) ? opts.hours : 6;
  const maxDrops = Number.isFinite(opts.maxDrops) ? opts.maxDrops : 4000;
  const frac = STYLES[style];
  const problems = [];
  const fail = (m) => { if (problems.length < 30 && problems.indexOf(m) === -1) problems.push(m); };

  resetAll();
  let t = START;
  setTimeSource(() => t, 0);
  meta.init();

  const tl = { firstPart: null, depth: {}, collapse: null, goldPerHour: null };
  const rigsBuilt = [];           // part ids of each rig the bot built
  const boughtPartAt = {};
  let simS = 0, drops = 0, lastEarnS = 0, lastGoldEarned = 0, rig = null, rigKey = '';
  const wait = (s) => { // let the clock and the crew run
    let left = s;
    while (left > 0) { const dt = Math.min(1, left); t += dt * 1000; meta.tick(dt * 1000); left -= dt; simS += dt; }
  };

  const checkNumbers = (where) => {
    const vals = { gold: meta.gold(), shards: meta.shards(), coreDust: meta.coreDust(), gps: meta.crew.perSecond() };
    for (const k of Object.keys(vals)) if (bad(vals[k])) fail(`bad number: ${k} = ${vals[k]} (${where})`);
    const m = meta.getMods();
    for (const k of ['maxStrain', 'keepOnSnap', 'goldMult', 'strainMult', 'luck', 'startDepth']) if (!Number.isFinite(m[k]) || m[k] < 0) fail(`bad mod: ${k} = ${m[k]}`);
  };

  const rebuild = () => {
    const mods = meta.getMods(), owned = meta.ownedParts();
    const key = JSON.stringify([mods.cols, mods.rows, owned]);
    if (key === rigKey && rig) return;
    rigKey = key;
    rig = suggest.bestRig(mods, owned, { maxEvals: 60, budgetMs: 5000 });
    rigsBuilt.push(rig.cells.flat().filter(Boolean));
  };

  // Buy the best affordable thing. Parts first, then rope and friends, then crew. Cheapest first inside a group.
  const shop = () => {
    let bought = 0;
    for (let guard = 0; guard < 50; guard++) {
      const gold = meta.gold(), shards = meta.shards();
      const opts2 = [];
      for (const p of meta.workshop.list()) if (p.state === 'buyable') opts2.push({ g: 0, cost: p.cost, run: () => meta.buyPart(p.id), what: 'part ' + p.id, part: p.id });
      for (const u of meta.upgrades.list()) if (u.canBuy) {
        const own = u.currency === 'gold' ? u.cost <= gold : u.currency === 'shards' ? u.cost <= shards : false;
        if (own) opts2.push({ g: u.id === 'tools' ? 2 : 1, cost: u.cost, run: () => meta.upgrades.buy(u.id), what: 'upgrade ' + u.id });
      }
      for (const c of meta.crew.list()) if (c.canBuy && c.cost <= gold) opts2.push({ g: 2, cost: c.cost, run: () => meta.crew.buy(c.id, 1), what: 'crew ' + c.id });
      opts2.sort((a, b) => a.g - b.g || a.cost - b.cost);
      const pick = opts2[0];
      if (!pick) break;
      const r = pick.run();
      if (r && r.ok === false) break;
      bought++;
      if (pick.part && tl.firstPart === null) tl.firstPart = simS;
      if (pick.part && boughtPartAt[pick.part] === undefined) boughtPartAt[pick.part] = simS;
    }
    return bought;
  };

  const policy = frac === null || frac === undefined ? undefined
    : ({ run }) => (run.state.strain >= frac * run.state.maxStrain ? 'haul' : 'continue');

  const endAt = hours * 3600;
  let seed = 1000;
  while (simS < endAt && drops < maxDrops && problems.length === 0) {
    shop();
    rebuild();
    const mods = meta.getMods();
    const bestBefore = meta.stats.get ? (meta.stats.get().bestDepth || 0) : 0;
    let res;
    try { res = simulateRun({ rig, mods, seed: seed++, policy }); } catch (e) { fail('engine threw: ' + (e && e.message)); break; }
    drops++;
    wait(res.beats * ENGINE.baseBeatMs / 1000 + DROP_PAUSE_S);
    for (const k of ['gold', 'kept', 'depth', 'strain']) if (bad(res[k])) fail(`bad run number: ${k} = ${res[k]} (drop ${drops})`);
    const pay = computePayout({ outcome: res.outcome, gold: res.gold, goldKept: res.kept, depth: res.depth, bestBefore, partsInRig: rig.cells.flat().filter(Boolean) });
    meta.addGold(pay.kept);
    meta.addShards(pay.shardsEarned);
    runhooks.onRunEnded({ outcome: res.outcome, depth: res.depth, rig, partsUsed: pay.partsUsed });
    checkNumbers('after drop ' + drops);
    const best = meta.stats.get && meta.stats.get().bestDepth !== undefined ? meta.stats.get().bestDepth : res.depth;
    for (const d of DEPTH_MARKS) if (tl.depth[d] === undefined && Math.max(best, res.depth) >= d) tl.depth[d] = simS;

    if (meta.collapse.available()) { tl.collapse = simS; break; }

    // Stuck check: gold must grow, or something must be buyable, within 20 minutes.
    const earned = meta.stats.get().goldEarned;
    if (earned > lastGoldEarned) { lastGoldEarned = earned; lastEarnS = simS; }
    if (simS - lastEarnS > STUCK_S) { fail(`stuck: no Gold earned for 20 minutes at ${fmtT(simS)} (gold ${Math.floor(meta.gold())})`); break; }
  }
  const earnedTotal = meta.stats.get().goldEarned;
  tl.goldPerHour = simS > 0 ? earnedTotal / (simS / 3600) : 0;

  // Static checks on the data.
  const comboIds = new Set(allCombos().map((c) => c.id));
  const unreachable = [];
  for (const p of allParts()) {
    const u = p.unlock || {};
    if (u.type === 'codex' && !comboIds.has(u.value)) unreachable.push(`${p.id} needs unknown combo "${u.value}"`);
  }
  for (const u of unreachable) fail('unreachable unlock: ' + u);

  // Part checks (only meaningful when the run reached the end without trouble).
  // A late rig naturally uses most of what you own, so "how often is it in the best rig" proves nothing.
  // The fair question: how much does the best rig lose when this one part is banned? (see partImpacts)
  const owned = meta.ownedParts();
  const unused = [];
  const usage = {};
  const lateRigs = rigsBuilt.slice(Math.floor(rigsBuilt.length * 2 / 3));
  for (const r of lateRigs) for (const id of new Set(r)) usage[id] = (usage[id] || 0) + 1;
  for (const id of Object.keys(boughtPartAt)) {
    if (id !== 'hook' && !rigsBuilt.some((r) => r.indexOf(id) !== -1)) unused.push(id);
  }
  let impacts = {};
  if (problems.length === 0) {
    for (const id of unused) fail(`part never worth buying: ${id}`);
    if (rig) {
      impacts = partImpacts(meta.getMods(), owned, rig);
      for (const id of Object.keys(impacts)) if (impacts[id] > MUST_HAVE_LOSS) fail(`must-have part: banning ${id} cuts the best rig's Gold by ${Math.round(100 * impacts[id])}% (limit ${Math.round(100 * MUST_HAVE_LOSS)}%)`);
    }
  }

  return { style, hours: simS / 3600, drops, timeline: tl, problems, owned, usage, impacts, rigs: rigsBuilt.length, goldEarned: earnedTotal, bestDepth: meta.stats.get().bestDepth };
}


// ---- Part dominance -------------------------------------------------------------------------
export const MUST_HAVE_LOSS = 0.7; // a part is "must-have" if banning it loses more than 70% of the best rig's Gold
const IMPACT_SEEDS = 12;

function rigGold(rig, mods) {
  let total = 0;
  const policy = ({ run }) => (run.state.strain >= 0.85 * run.state.maxStrain ? 'haul' : 'continue');
  for (let i = 0; i < IMPACT_SEEDS; i++) {
    try { total += simulateRun({ rig, mods: { ...mods, cheat: null }, seed: 7000 + i, policy }).kept; } catch (e) { /* counted as 0 */ }
  }
  return total / IMPACT_SEEDS;
}

// For every part type in the rig: the share of Gold lost when it is banned (0 = no loss, 1 = everything).
// The rig is rebuilt without the part, so the player's best way around it is allowed.
export function partImpacts(mods, owned, rig, budgetMs = 600) {
  const out = {};
  const base = rigGold(rig, mods);
  if (!(base > 0)) return out;
  const ids = Array.from(new Set(rig.cells.flat().filter(Boolean)));
  for (const id of ids) {
    if (id === 'hook') continue; // the Hook is the only Part you start with, so it is always allowed
    const rest = { ...owned }; delete rest[id];
    const alt = suggest.bestRig(mods, rest, { maxEvals: 60, budgetMs });
    out[id] = Math.max(0, Math.min(1, 1 - rigGold(alt, mods) / base));
  }
  return out;
}

export function fmtT(s) {
  if (s === null || s === undefined) return 'not reached';
  if (s < 90) return Math.round(s) + ' s';
  if (s < 5400) return (s / 60).toFixed(1) + ' min';
  return (s / 3600).toFixed(2) + ' h';
}

export function printResult(r) {
  const tl = r.timeline;
  console.log(`\n== Style: ${r.style === 'never' ? 'never haul' : 'haul at ' + r.style + '%'}  (${r.drops} drops, ${fmtT(r.hours * 3600)} played)`);
  console.log('  first part bought : ' + fmtT(tl.firstPart));
  for (const d of DEPTH_MARKS) console.log(`  reached ${String(d).padStart(4)} m    : ` + fmtT(tl.depth[d] === undefined ? null : tl.depth[d]));
  console.log('  first Collapse    : ' + fmtT(tl.collapse));
  console.log('  gold per hour     : ' + Math.round(tl.goldPerHour));
  console.log('  parts owned       : ' + Object.keys(r.owned).join(', '));
  const imp = Object.entries(r.impacts || {}).sort((a, b) => b[1] - a[1]);
  if (imp.length) console.log('  biggest part loss : ' + imp.slice(0, 4).map(([k, v]) => k + ' ' + Math.round(100 * v) + '%').join(', ') + ' (when banned)');
  if (r.problems.length) for (const p of r.problems) console.log('  FAIL ' + p);
  else console.log('  PASS');
}

// CLI
const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
  const which = arg('style', 'all');
  const hours = Number(arg('hours', 6));
  const styles = which === 'all' ? ['70', '85', 'never'] : [which];
  let failed = 0;
  for (const s of styles) {
    if (!(s in STYLES)) { console.log('FAIL unknown style ' + s); failed++; continue; }
    const r = playBot(s, { hours });
    printResult(r);
    if (r.problems.length) failed++;
  }
  console.log(failed ? `\nbot: FAIL (${failed} of ${styles.length} styles)` : '\nbot: PASS');
  process.exit(failed ? 1 : 0);
}
