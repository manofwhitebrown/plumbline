// Balance report. Plays the bot in every style and prints one page a designer can read.
// Run: node tools/balance-report.js [--hours=6] [--json] [--out=docs/BALANCE.md]
// Exit code 1 if a target is missed, so it can run in CI.
import { writeFileSync } from 'node:fs';
import { playBot, fmtT, STYLES } from './bot.js';
import { simulateRun } from '../src/engine/index.js';
import { ENGINE, DEFAULT_MODS } from '../src/data/engine.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { CREW } from '../src/data/crew.js';
import { suggest } from '../src/tutorial/suggest.js';

// Design targets (docs/CONTRACT.md). Hours.
export const TARGETS = {
  collapseMinH: 1.5,           // first Collapse is not before this...
  collapseMaxH: 3.5,           // ...and not after this (the goal is "2 to 3 hours"; the band leaves room for play style)
  firstDropMinS: 45, firstDropMaxS: 90,
};

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const sci = (n) => (n >= 1e6 ? n.toExponential(1) : String(Math.round(n)));

export function firstDrop(n = 400) {
  const mods = { ...DEFAULT_MODS };
  const rig = suggest.bestRig(mods, { hook: 1 }, { maxEvals: 30 });
  const run = (policy) => {
    const s = [], g = [];
    for (let seed = 1; seed <= n; seed++) { const r = simulateRun({ rig, mods, seed, policy }); s.push(r.beats * ENGINE.baseBeatMs / 1000); g.push(r.gold); }
    return { p10: pct(s, 0.1), p50: pct(s, 0.5), p90: pct(s, 0.9), gold50: pct(g, 0.5) };
  };
  return { never: run(undefined), haul80: run(({ run: r }) => (r.state.strain >= 0.8 * r.state.maxStrain ? 'haul' : 'continue')) };
}

export function buildReport(hours = 6) {
  const lines = [], misses = [];
  const out = (s = '') => lines.push(s);
  out('# Plumbline balance report');
  out('');
  out(`Beat ${ENGINE.baseBeatMs} ms. Rope: ${UPGRADES.find((u) => u.id === 'rope').max} levels of +${UPGRADES.find((u) => u.id === 'rope').per} max Strain. Bot plays up to ${hours} h per style.`);
  out('');
  out('## First drop (starter rig, 400 seeds)');
  const fd = firstDrop();
  const row = (name, x) => `| ${name} | ${x.p10.toFixed(0)} s | ${x.p50.toFixed(0)} s | ${x.p90.toFixed(0)} s | ${x.gold50.toFixed(0)} |`;
  out('| Play style | 10% | median | 90% | median Gold |');
  out('|---|---|---|---|---|');
  out(row('never haul', fd.never)); out(row('haul at 80%', fd.haul80));
  if (fd.never.p10 < TARGETS.firstDropMinS || fd.never.p90 > TARGETS.firstDropMaxS) misses.push(`first drop (never haul) ${fd.never.p10.toFixed(0)}..${fd.never.p90.toFixed(0)} s is outside ${TARGETS.firstDropMinS}-${TARGETS.firstDropMaxS} s`);
  if (fd.haul80.p50 < TARGETS.firstDropMinS) misses.push(`first drop (haul 80%) median ${fd.haul80.p50.toFixed(0)} s is under ${TARGETS.firstDropMinS} s`);
  out('');
  out('## Progression by play style');
  out('');
  out('| Style | 100 m | 250 m | 500 m | First Collapse | Gold/hour at the end | Result |');
  out('|---|---|---|---|---|---|---|');
  const details = [];
  for (const st of Object.keys(STYLES)) {
    const r = playBot(st, { hours });
    const t = r.timeline;
    const name = st === 'never' ? 'never haul' : `haul at ${st}%`;
    out(`| ${name} | ${fmtT(t.depth[100] ?? null)} | ${fmtT(t.depth[250] ?? null)} | ${fmtT(t.depth[500] ?? null)} | ${fmtT(t.collapse)} | ${sci(t.goldPerHour)} | ${r.problems.length ? 'FAIL' : 'pass'} |`);
    const h = t.collapse === null ? null : t.collapse / 3600;
    if (h === null) misses.push(`${name}: no Collapse within ${hours} h`);
    else if (h < TARGETS.collapseMinH || h > TARGETS.collapseMaxH) misses.push(`${name}: first Collapse at ${h.toFixed(2)} h is outside ${TARGETS.collapseMinH}-${TARGETS.collapseMaxH} h`);
    for (const p of r.problems) misses.push(`${name}: ${p}`);
    details.push({ name, r });
  }
  out('');
  out('## Part dominance (share of the best rig\'s Gold lost when the part is banned)');
  out('');
  out('A late rig uses almost everything you own, so "how often is it in the best rig" says nothing. This asks how bad life is without the part.');
  out('');
  for (const { name, r } of details) {
    const imp = Object.entries(r.impacts || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
    out(`- ${name}: ${imp.length ? imp.map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ') : 'not measured (run had problems)'}`);
  }
  out('');
  out('## Gold upgrades (cost of the last level)');
  out('');
  for (const u of UPGRADES.filter((x) => x.currency === 'gold')) {
    const last = Math.ceil(u.base * Math.pow(u.growth, u.max - 1));
    out(`- ${u.id}: ${u.max} levels, last level costs ${sci(last)} Gold`);
  }
  out('');
  out('## Crew');
  out('');
  for (const c of CREW) out(`- ${c.id}: base cost ${sci(c.baseCost)}, ${c.baseGps} Gold/s each, unlocks at ${c.unlockDepth} m`);
  out('');
  out(misses.length ? '## MISSED TARGETS\n\n' + misses.map((m) => '- ' + m).join('\n') : '## All targets met');
  return { text: lines.join('\n') + '\n', misses };
}

const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const { text, misses } = buildReport(Number(arg('hours', 6)));
  console.log(text);
  const file = arg('out', null);
  if (file) { writeFileSync(file, text); console.log('written to ' + file); }
  process.exit(misses.length ? 1 : 0);
}
