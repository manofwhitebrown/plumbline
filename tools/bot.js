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
import { startOptions } from '../src/engine/play/firstHour.js';

export const STYLES = { 50: 0.5, 70: 0.7, 85: 0.85, 100: null, never: null }; // number = haul at that % of Strain; 100 and never = never haul
const START = 1_700_000_000_000;
let PLAY;                       // [ECONOMY-2] The real game has the play layer (boons, skills) on, so the bot does too. Pass opts.play = false or --play=off for the old plain engine.
const DROP_PAUSE_S = 3;          // time the player spends on the results and rig screens
const STUCK_S = 20 * 60;         // 20 simulated minutes without any way forward
const DEPTH_MARKS = [100, 250, 500, 1000];
const NO_CLOCK = 1e9;               // [ECONOMY-3] rig searches stop by evaluation count only, so results do not change when the machine is busy
const SAVE_S = 20 * 60;          // [ECONOMY-3] save for rope when it is at most 20 minutes of Crew income away

// Counts every boon card offered and every boon picked, so pick rates can be checked.
export function tallyBoons(stats, events) {
  for (const e of events) {
    if (e.t === 'BOON_OFFER' && e.kind === 'boon') { stats.offers++; for (const o of e.options) stats.offered[o.id] = (stats.offered[o.id] || 0) + 1; }
    else if (e.t === 'BOON_PICK' && e.via === 'pick') { stats.picks++; stats.picked[e.id] = (stats.picked[e.id] || 0) + 1; }
  }
}
export const newBoonStats = () => ({ offers: 0, picks: 0, offered: {}, picked: {} });

// [ECONOMY-3] Gold kept per beat of a rig over a few seeds (the bot's own haul style). Used to choose between two rigs.
function goldPerBeat(rig, mods, policy, seeds = 16) {
  let g = 0, b = 0;
  for (let i = 0; i < seeds; i++) {
    try { const r = simulateRun({ rig, mods: { ...mods, cheat: null }, seed: 9000 + i, policy, play: PLAY }); g += r.kept; b += r.beats; } catch (e) { /* counted as nothing */ }
  }
  return b > 0 ? g / b : 0;
}

function bad(x) { return typeof x === 'number' && (!Number.isFinite(x) || x < 0); }

// Plays one style. Returns { style, problems, timeline, ... }. Never throws.
export function playBot(style = '70', opts = {}) {
  const hours = Number.isFinite(opts.hours) ? opts.hours : 6;
  const playOn = opts.play !== false;
  PLAY = playOn ? {} : undefined;
  const boonStats = opts.boonStats || (playOn ? newBoonStats() : null); // [ECONOMY-1] pick rates are always counted when the play layer is on
  const maxDrops = Number.isFinite(opts.maxDrops) ? opts.maxDrops : 4000;
  const frac = STYLES[style];
  const problems = [];
  const fail = (m) => { if (problems.length < 30 && problems.indexOf(m) === -1) problems.push(m); };

  resetAll();
  let t = START;
  setTimeSource(() => t, 0);
  meta.init();

  const tl = { firstPart: null, depth: {}, collapse: null, post1000: null, goldPerHour: null }; // [ECONOMY-3] post1000 = seconds after the Collapse until a single drop reaches 1000 m (only with opts.collapse)
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

  const policy = frac === null || frac === undefined ? undefined
    : ({ run }) => (run.state.strain >= frac * run.state.maxStrain ? 'haul' : 'continue');

  const rebuild = () => {
    const mods = meta.getMods(), owned = meta.ownedParts();
    const key = JSON.stringify([mods.cols, mods.rows, owned]);
    if (key === rigKey && rig) return;
    rigKey = key;
    rig = suggest.bestRig(mods, owned, { maxEvals: 60, budgetMs: NO_CLOCK });
    // [ECONOMY-3] The rig finder may stack duplicate copies (Extra Copy) that make Strain pile up and drops shallow.
    // A player would try both and keep the one that pays more per beat, so the bot does too.
    const single = {}; for (const id of Object.keys(owned)) single[id] = 1;
    if (Object.keys(owned).some((id) => owned[id] > 1)) {
      const alt = suggest.bestRig(mods, single, { maxEvals: 60, budgetMs: NO_CLOCK });
      if (goldPerBeat(alt, mods, policy) > goldPerBeat(rig, mods, policy)) rig = alt;
    }
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
        const own = u.currency === 'gold' ? u.cost <= gold : u.currency === 'shards' ? u.cost <= shards : u.currency === 'core' ? u.cost <= meta.coreDust() : false; // [ECONOMY-3] Core Dust upgrades after a Collapse
        if (own) opts2.push({ g: u.id === 'tools' ? 2 : 1, cost: u.cost, run: () => meta.upgrades.buy(u.id), what: 'upgrade ' + u.id });
      }
      // [ECONOMY-3] A real player saves for the next rope level instead of spending every coin on Crew.
      // Crew is skipped while the next rope level is out of reach but less than SAVE_S seconds of Crew income away.
      const rope = meta.upgrades.list().find((u) => u.id === 'rope');
      const gps = meta.crew.perSecond();
      const saving = !!(rope && !rope.maxed && !rope.reason && rope.cost > gold && (rope.cost - gold) / Math.max(gps, 0.001) < SAVE_S);
      for (const c of meta.crew.list()) if (!saving && c.canBuy && c.cost <= gold) opts2.push({ g: 2, cost: c.cost, run: () => meta.crew.buy(c.id, 1), what: 'crew ' + c.id });
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


  const endAt = hours * 3600;
  let seed = Number.isFinite(opts.seed) ? Math.floor(opts.seed) : 1000, snapStreak = 0; // [ECONOMY-2] --seed=N repeats the same player with other luck
  while (simS < endAt && drops < maxDrops && problems.length === 0) {
    shop();
    rebuild();
    const mods = meta.getMods();
    const bestBefore = meta.stats.get ? (meta.stats.get().bestDepth || 0) : 0;
    let res;
    const playOpt = playOn && drops > 0 ? startOptions(drops, snapStreak) : undefined; // drop 0 is the tutorial drop (no play layer); then the first-hour script and mercy, like the real game
    try { res = simulateRun({ rig, mods, seed: seed++, policy, play: playOpt, withEvents: !!boonStats }); } catch (e) { fail('engine threw: ' + (e && e.message)); break; }
    drops++;
    snapStreak = res.outcome === 'snapped' ? snapStreak + 1 : 0;
    if (boonStats && res.events) tallyBoons(boonStats, res.events);
    wait(res.beats * ENGINE.baseBeatMs / 1000 + DROP_PAUSE_S);
    for (const k of ['gold', 'kept', 'depth', 'strain']) if (bad(res[k])) fail(`bad run number: ${k} = ${res[k]} (drop ${drops})`);
    const pay = computePayout({ outcome: res.outcome, gold: res.gold, goldKept: res.kept, depth: res.depth, bestBefore, partsInRig: rig.cells.flat().filter(Boolean) });
    meta.addGold(pay.kept);
    meta.addShards(pay.shardsEarned);
    runhooks.onRunEnded({ outcome: res.outcome, depth: res.depth, rig, partsUsed: pay.partsUsed });
    checkNumbers('after drop ' + drops);
    const best = meta.stats.get && meta.stats.get().bestDepth !== undefined ? meta.stats.get().bestDepth : res.depth;
    for (const d of DEPTH_MARKS) if (tl.depth[d] === undefined && Math.max(best, res.depth) >= d) tl.depth[d] = simS;

    if (opts.onDrop) opts.onDrop({ simS, drops, res, mods, rig, gold: meta.gold(), gps: meta.crew.perSecond() });
    // Collapse is only noted, not taken: the run goes on so we can see if 1000 m is reachable.
    if (tl.collapse === null && meta.collapse.available()) {
      tl.collapse = simS;
      if (opts.collapse) { const c = meta.collapse.do(); if (c && c.ok) { tl.coreDustGain = c.coreDustGain; rigKey = ''; rig = null; } }
    }
    if (opts.collapse) {
      if (tl.collapse !== null && tl.post1000 === null && res.depth >= 1000 && simS > tl.collapse) tl.post1000 = simS - tl.collapse;
      if (tl.post1000 !== null) break;
    } else if (tl.collapse !== null && tl.depth[1000] !== undefined) break;

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
  if (problems.length === 0 && opts.partChecks !== false) { // [ECONOMY-2] --parts=off skips the slow part checks while tuning
    for (const id of unused) fail(`part never worth buying: ${id}`);
    if (rig) {
      impacts = partImpacts(meta.getMods(), owned, rig);
      for (const id of Object.keys(impacts)) if (impacts[id] > MUST_HAVE_LOSS) fail(`must-have part: banning ${id} cuts the best rig's Gold by ${Math.round(100 * impacts[id])}% (limit ${Math.round(100 * MUST_HAVE_LOSS)}%)`);
    }
  }

  return { style, tookCollapse: !!opts.collapse, hours: simS / 3600, drops, timeline: tl, problems, owned, usage, impacts, rigs: rigsBuilt.length, boonStats, goldEarned: earnedTotal, bestDepth: meta.stats.get().bestDepth };
}


// ---- Part dominance -------------------------------------------------------------------------
export const MUST_HAVE_LOSS = 0.7; // a part is "must-have" if banning it loses more than 70% of the best rig's Gold
const IMPACT_SEEDS = 24; // [ECONOMY-1] more seeds, and a trimmed mean below: one lucky 1000 m drop used to decide the whole answer

function rigGold(rig, mods) {
  const gold = [];
  const policy = ({ run }) => (run.state.strain >= 0.85 * run.state.maxStrain ? 'haul' : 'continue');
  for (let i = 0; i < IMPACT_SEEDS; i++) {
    let g = 0;
    try { g = simulateRun({ rig, mods: { ...mods, cheat: null }, seed: 7000 + i, policy, play: PLAY }).kept; } catch (e) { /* counted as 0 */ }
    gold.push(g);
  }
  gold.sort((a, b) => a - b);
  const keep = gold.slice(0, Math.ceil(gold.length * 0.75)); // trimmed mean: the richest quarter (rare-boon jackpots) is left out
  return keep.reduce((a, b) => a + b, 0) / keep.length;
}

// For every part type in the rig: the share of Gold lost when it is banned (0 = no loss, 1 = everything).
// The rig is rebuilt without the part, so the player's best way around it is allowed.
export function partImpacts(mods, owned, rig, budgetMs = NO_CLOCK) {
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
  if (tl.post1000 !== undefined && tl.post1000 !== null || r.tookCollapse) console.log('  1000 m after it   : ' + fmtT(tl.post1000));
  console.log('  gold per hour     : ' + Math.round(tl.goldPerHour));
  console.log('  parts owned       : ' + Object.keys(r.owned).join(', '));
  const imp = Object.entries(r.impacts || {}).sort((a, b) => b[1] - a[1]);
  if (imp.length) console.log('  biggest part loss : ' + imp.slice(0, 4).map(([k, v]) => k + ' ' + Math.round(100 * v) + '%').join(', ') + ' (when banned)');
  const bs = r.boonStats;
  if (bs && bs.picks > 0) {
    const rows = Object.keys(bs.picked).map((id) => ({ id, share: bs.picked[id] / bs.picks, rate: bs.picked[id] / Math.max(1, bs.offered[id] || 0) })).sort((a, b) => b.share - a.share);
    console.log(`  boons             : ${bs.picks} picks of ${bs.offers} offers; top by share of picks: ` + rows.slice(0, 5).map((x) => `${x.id} ${Math.round(100 * x.share)}% (of offers ${Math.round(100 * x.rate)}%)`).join(', '));
    const hi = rows.slice().sort((a, b) => b.rate - a.rate)[0];
    if (hi) console.log(`  boon top rate     : ${hi.id} picked in ${Math.round(100 * hi.rate)}% of the offers that showed it`);
  }
  if (r.problems.length) for (const p of r.problems) console.log('  FAIL ' + p);
  else console.log('  PASS');
}

// CLI
const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
  const which = arg('style', 'all');
  const playOn = arg('play', 'on') !== 'off';
  const hours = Number(arg('hours', 6));
  const styles = which === 'all' ? ['70', '85', 'never'] : [which];
  let failed = 0;
  for (const s of styles) {
    if (!(s in STYLES)) { console.log('FAIL unknown style ' + s); failed++; continue; }
    const r = playBot(s, { hours, play: playOn, seed: Number(arg('seed', NaN)), partChecks: arg('parts', 'on') !== 'off', collapse: arg('collapse', 'off') === 'on' });
    printResult(r);
    if (r.problems.length) failed++;
  }
  console.log(failed ? `\nbot: FAIL (${failed} of ${styles.length} styles)` : '\nbot: PASS');
  process.exit(failed ? 1 : 0);
}
