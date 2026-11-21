// Speed run (PERF-2). Repeats the frame-time measurement in a real headless Chromium with the CPU slowed down.
//
// One-time setup, in a folder OUTSIDE the repo (nothing here is added to the game):
//   mkdir ~/perf-tools && cd ~/perf-tools && npm i puppeteer-core @sparticuz/chromium
// Run from the repo:
//   PERF_TOOLS=~/perf-tools node dev/perf-run.js [--throttle 1,4,6] [--quality low,high,auto] [--biomes clay,quartz,...]
//                                                [--seconds 20] [--warm 6] [--dpr 2] [--size 360x640] [--particles 300] [--canvas cpu|gpu] [--bench depth] [--json out.json]
// Without --throttle it runs 4 and 6. It starts `vite` itself on port 5173 (or uses one already running).
// What it prints: for each biome, quality and slowdown: median, p95 and worst gap between frames (ms), the time
// the draw code itself took, and the share of frames over 25 ms. "interval" is what a player feels.
// Honest limits: headless Chromium draws the canvas in software (no phone GPU) and the CPU slowdown is a model,
// not a phone. Use the numbers to compare before and after, and confirm on a real phone when you can.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import http from 'node:http';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const list = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);
const tools = resolve((process.env.PERF_TOOLS || '.').replace(/^~/, process.env.HOME || ''));
const req = createRequire(resolve(tools, 'noop.js'));
const PORT = 5173, BASE = 'http://localhost:' + PORT;
const throttles = list(arg('throttle', '4,6')).map(Number);
const qualities = list(arg('quality', 'low,high,auto'));
const biomes = list(arg('biomes', 'clay,quartz,amber,magma,void,abyss'));
const looksOn = arg('looks', '0') === '1'; // --looks 1 wears the richest Looks
const reduceOn = arg('reduce', '0') === '1'; // --reduce 1 = Reduce motion on
const bench = arg('bench', ''); // 'depth' = time the depth layer alone, stage by stage
const seconds = Number(arg('seconds', 20)), warm = Number(arg('warm', 6)), dpr = Number(arg('dpr', 2)), particles = Number(arg('particles', 300));
const canvasMode = arg('canvas', 'cpu'); // cpu = canvas drawn by the CPU (like a weak phone); gpu = Chromium's software GPU emulator (SwiftShader, slow and spiky)
const [vw, vh] = arg('size', '360x640').split('x').map(Number);

const up = () => new Promise((ok) => { http.get(BASE + '/dev/perf-lab.html', (res) => { res.resume(); ok(res.statusCode === 200); }).on('error', () => ok(false)); });
async function ensureServer() {
  if (await up()) return null;
  const p = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: resolve(import.meta.dirname, '..'), stdio: 'ignore', shell: process.platform === 'win32' });
  for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 500)); if (await up()) return p; }
  p.kill(); throw new Error('vite did not start');
}

let puppeteer, chromium;
try { puppeteer = req('puppeteer-core'); chromium = req('@sparticuz/chromium'); }
catch (e) { console.error('Could not load puppeteer-core / @sparticuz/chromium from ' + tools + '. See the setup lines at the top of this file.'); process.exit(2); }
chromium = chromium.default || chromium;

const server = await ensureServer();
const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: 'shell', args: canvasMode === 'cpu' ? chromium.args.concat(['--disable-accelerated-2d-canvas']) : chromium.args });
const rows = [];
try {
  { const page = await browser.newPage(); await page.goto(`${BASE}/dev/perf-lab.html?seconds=2&warm=0`, { waitUntil: 'load' }); await page.waitForFunction('window.__perf', { timeout: 120000, polling: 500 }); await page.close(); } // throwaway: lets vite compile every module once
  for (const rate of throttles) for (const quality of (bench === 'depth' ? ['high', 'medium'] : qualities)) for (const biome of biomes) {
    const page = await browser.newPage();
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dpr });
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.goto(`${BASE}/dev/perf-lab.html?biome=${biome}&quality=${quality}&seconds=${seconds}&warm=${warm}&w=${vw}&h=${vh}&dpr=${dpr}&particles=${particles}${looksOn ? '&looks=1' : ''}${reduceOn ? '&reduce=1' : ''}${bench ? '&bench=' + bench + '&level=' + quality : ''}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__perf', { timeout: (seconds + warm + 60) * 1000 * Math.max(1, rate / 2), polling: 500 });
    const res = await page.evaluate('window.__perf'); res.throttle = rate; rows.push(res);
    if (res.bench) { console.log(`${rate}x depth ${res.level.padEnd(6)} ${biome.padEnd(6)} median ${res.medianMs} p95 ${res.p95Ms} ms | ${JSON.stringify(res.meanStageMs)}`); await page.close(); continue; }
    console.log(`${rate}x ${quality.padEnd(4)} ${biome.padEnd(6)} gap median ${res.interval.median} p95 ${res.interval.p95} worst ${res.interval.worst}${res.stalls ? ' (' + res.stalls + ' stalls over 1 s, worst at ' + res.worstAtSec + ' s, its draw code took ' + res.worstDrawMs + ' ms)' : ''} | draw median ${res.jsFrame.median} p95 ${res.jsFrame.p95} | >25ms ${(res.overBudgetShare * 100).toFixed(1)}% | particles<=${res.maxParticles} | end ${res.finalTier}${res.finalQuality === 'low' ? '/low' : ''} ${res.tierLog ? '[' + res.tierLog + ']' : ''}`);
    await page.close();
  }
} finally { await browser.close(); if (server) server.kill(); }
const jf = arg('json', ''); if (jf) writeFileSync(jf, JSON.stringify(rows, null, 1));
