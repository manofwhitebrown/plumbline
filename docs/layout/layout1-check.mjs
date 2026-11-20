// LAYOUT-1 gate runner. Opens every screen at every size in LAYOUT_CHECK.md section 1, with the twists.
// It reuses the audit function from browser-check.mjs (NEW-8) and adds: modals, the Drop screen (no scroll,
// canvas not stretched or blurry), the real Large text and Reduce motion settings, notch variables.
//
// How to run (puppeteer-core is NOT a project dependency):
//   npm i --no-save puppeteer-core
//   npm run build && npx vite preview --port 5199 &
//   CHROME=/path/to/chrome node docs/layout/layout1-check.mjs --fixture extreme --sizes all --twist none
//   --twist none | large | reduce | notch | zoom125 | zoom150 | rotate | all-twists
//   --screens home,rig,drop,results,crew,workshop,codex,rewards,settings,guide,welcome   --out /tmp/result.json
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const BASE = args.base || 'http://localhost:5199/';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const FIXTURE = args.fixture || 'empty';
const SHOTS = args.shots || '/tmp/plumbline-shots';
mkdirSync(SHOTS, { recursive: true });

const SIZES = [[320, 568], [360, 640], [375, 667], [360, 780], [390, 844], [412, 915], [430, 932], [768, 1024], [844, 390], [1024, 768], [1440, 900], [1920, 1080]];
const KEY = [[360, 640], [390, 844], [1440, 900]];
const sizes = args.sizes === 'key' ? KEY : args.sizes === 'one' ? [[390, 844]] : args.sizes && args.sizes.includes('x') ? args.sizes.split(',').map((s) => s.split('x').map(Number)) : SIZES;
const ALL_SCREENS = 'welcome,home,rig,crew,workshop,codex,rewards,settings,guide,drop,results'.split(',');
const screens = args.screens ? args.screens.split(',') : ALL_SCREENS;
const twistArg = args.twist || 'none';
const twistList = twistArg === 'all-twists' ? ['large', 'reduce', 'notch', 'zoom125', 'zoom150', 'rotate'] : twistArg.split(',');

// Take the audit function out of NEW-8's file and patch two things.
const src = readFileSync(new URL('./browser-check.mjs', import.meta.url), 'utf8');
let auditSrc = src.slice(src.indexOf('function audit() {'), src.indexOf('\nconst browser = await')).trim();
const P1 = "const root = document.querySelector('#app') || document.body;";
const P2 = ".filter(visible).filter((el) => !el.closest('svg')";
if (!auditSrc.includes(P1) || !auditSrc.includes(P2)) throw new Error('browser-check.mjs changed: update the patches in layout1-check.mjs');
auditSrc = auditSrc.replace(P1, "const root = (window.__auditRoot && document.querySelector(window.__auditRoot)) || document.querySelector('#app') || document.body;")
  // The Home/screen backdrop drifts a few pixels on purpose and is clipped by its own box.
  // .hud-pops are the gold numbers that float up and fade on Drop (aria-hidden, not tappable, gone after about a second).
  // A decorative glow box inside an overflow:hidden number made scrollHeight bigger than the text. Measure the real text instead.
  .replace('el.scrollHeight > el.clientHeight + 2 && cs.display', '(() => { const rg = document.createRange(); rg.selectNodeContents(el); const a = rg.getBoundingClientRect(); const b = el.getBoundingClientRect(); return a.bottom > b.bottom + 1.5 || a.top < b.top - 1.5; })() && cs.display')
  .replace(P2, ".filter(visible).filter((el) => !el.closest('.ui-bd') && !el.closest('.hud-pops')).filter((el) => !el.closest('svg')");

// Extra checks that run in the page.
function extra(screenId) {
  const out = [];
  const vw = window.innerWidth; const vh = window.innerHeight;
  const doc = document.documentElement;
  if (screenId === 'drop' && doc.scrollHeight > vh + 1) out.push(`DROP SCREEN SCROLLS (${doc.scrollHeight} > ${vh})`);
  const app = document.querySelector('.app');
  if (app && app.scrollHeight > app.clientHeight + 1 && screenId === 'drop') out.push('DROP: app box scrolls');
  for (const c of document.querySelectorAll('#app canvas')) {
    const r = c.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || getComputedStyle(c).display === 'none') continue;
    const aspectBox = r.width / r.height; const aspectPx = c.width / c.height;
    if (Math.abs(aspectBox - aspectPx) / aspectPx > 0.03) out.push(`CANVAS STRETCHED box ${Math.round(r.width)}x${Math.round(r.height)} pixels ${c.width}x${c.height}`);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width < r.width * dpr * 0.45) out.push(`CANVAS BLURRY pixels ${c.width} for ${Math.round(r.width)} css px at density ${dpr}`);
    if (r.right > vw + 1 || r.left < -1) out.push(`CANVAS OUTSIDE SCREEN ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`);
  }
  // fixed elements must keep clear of the notch / home bar when those are on
  const sat = parseFloat(getComputedStyle(doc).getPropertyValue('--sat')) || 0;
  const sab = parseFloat(getComputedStyle(doc).getPropertyValue('--sab')) || 0;
  if (sat || sab) {
    const tabbar = document.querySelector('.tabbar');
    if (tabbar && sab) {
      const tb = tabbar.getBoundingClientRect();
      const btn = tabbar.querySelector('button');
      if (btn) { const br = btn.getBoundingClientRect(); if (br.bottom > vh - sab + 1) out.push(`TAB BAR BUTTON IN HOME BAR AREA bottom ${Math.round(br.bottom)} > ${vh - sab}`); }
      if (tb.bottom > vh + 1) out.push('TAB BAR OFF SCREEN');
    }
    if (sat) {
      const first = [...document.querySelectorAll('#app button, #app h1, #app h2, #app .title')].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < sat && r.bottom > 0 && !e.closest('.ui-bd'); });
      if (first && !document.querySelector('.layer .hud, .drop')) out.push(`UNDER NOTCH ${first.tagName.toLowerCase()} "${(first.textContent || '').trim().slice(0, 20)}" top ${Math.round(first.getBoundingClientRect().top)} < ${sat}`);
    }
  }
  return out;
}

function modalCheck() {
  const out = [];
  const vw = window.innerWidth; const vh = window.innerHeight;
  const m = document.querySelector('.modal');
  if (!m) return ['NO MODAL OPEN'];
  const r = m.getBoundingClientRect();
  if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) out.push(`MODAL OFF SCREEN ${Math.round(r.left)},${Math.round(r.top)} to ${Math.round(r.right)},${Math.round(r.bottom)} in ${vw}x${vh}`);
  const x = m.querySelector('.mx-x');
  if (x) {
    const xr = x.getBoundingClientRect();
    if (xr.width < 43.5 || xr.height < 43.5) out.push(`MODAL CLOSE TOO SMALL ${Math.round(xr.width)}x${Math.round(xr.height)}`);
    if (xr.top < 0 || xr.right > vw || xr.bottom > vh) out.push('MODAL CLOSE OFF SCREEN');
  }
  const body = m.querySelector('.mx-scroll');
  if (body && body.scrollHeight > body.clientHeight + 1 && !/(auto|scroll)/.test(getComputedStyle(body).overflowY)) out.push('MODAL BODY CUT OFF, NO SCROLL');
  const foot = m.querySelector(':scope > .stack:last-child');
  if (foot) { const fr = foot.getBoundingClientRect(); if (fr.bottom > vh + 1) out.push('MODAL BUTTONS BELOW SCREEN'); }
  return out;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const results = [];
const consoleProblems = new Set();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const urlFor = (screen) => BASE + '?debug=1&fixture=' + FIXTURE + (screen ? '&screen=' + screen : '');

async function openPage(w, h, tw, screen) {
  const zoom = tw === 'zoom125' ? 1.25 : tw === 'zoom150' ? 1.5 : 1;
  const page = await browser.newPage();
  const mobile = w <= 900;
  await page.setViewport({ width: Math.round(w / zoom), height: Math.round(h / zoom), deviceScaleFactor: 2 * zoom, isMobile: mobile, hasTouch: mobile });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/was preloaded using link preload/.test(m.text())) consoleProblems.add(`${w}x${h} ${tw} console ${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => consoleProblems.add(`${w}x${h} ${tw} page error: ${String(e).slice(0, 160)}`));
  if (tw === 'notch') {
    const cdp = await page.createCDPSession();
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 44, bottom: 34, left: 0, right: 0 } }); } catch (e) { consoleProblems.add('notch emulation not available: ' + e.message); }
  }
  await page.goto(urlFor(screen), { waitUntil: 'load' });
  await page.waitForSelector('.tabbar, .drop, #app canvas', { timeout: 20000 });
  await wait(900);
  await page.evaluate((t) => {
    const g = window.game; const s = g && g.ctx && g.ctx.settings;
    const set = (k, v) => { try { if (s && s.setSetting) s.setSetting(k, v); else throw new Error('x'); } catch (e) { document.documentElement.dataset[k === 'largeText' ? 'large' : 'reduce'] = '1'; } };
    if (t === 'large') set('largeText', true);
    if (t === 'reduce') set('reduceMotion', true);
    if (t === 'notch') { const st = document.documentElement.style; st.setProperty('--sat', '44px'); st.setProperty('--sab', '34px'); }
  }, tw);
  await wait(300);
  return page;
}

async function dismissModal(page) {
  const open = await page.evaluate(() => !!document.querySelector('.modal'));
  if (!open) return false;
  await page.evaluate(() => { const m = document.querySelector('.modal'); const b = m.querySelector('.mx-x') || m.querySelector('.btn.primary'); b && b.click(); });
  await wait(600);
  return true;
}

async function runScreen(page, s, w, h, tw) {
  const tag = `${s}-${w}x${h}-${tw}-${FIXTURE}`;
  let problems = [];
  if (s === 'welcome') {
    const has = await page.evaluate(() => !!document.querySelector('.modal'));
    if (!has) return { screen: s, size: `${w}x${h}`, twist: tw, problems: [], skipped: 'no welcome modal in this state' };
    await page.evaluate(() => { window.__auditRoot = '.modal'; });
    problems = [...await page.evaluate(modalCheck), ...(await page.evaluate(`(${auditSrc})()`)).filter((p) => !p.startsWith('note:'))];
    await page.evaluate(() => { window.__auditRoot = null; });
    await page.screenshot({ path: `${SHOTS}/${tag}.png` });
    return { screen: s, size: `${w}x${h}`, twist: tw, problems };
  }
  await dismissModal(page);
  if (s === 'drop' || s === 'results') {
    await page.goto(urlFor(s), { waitUntil: 'load' });
    await page.waitForSelector('#app canvas, .results, .screen', { timeout: 20000 });
    await wait(1200);
    await page.evaluate((t) => {
      const st = window.game.ctx.settings;
      if (t === 'large') st.setSetting('largeText', true);
      if (t === 'reduce') st.setSetting('reduceMotion', true);
      if (t === 'notch') { document.documentElement.style.setProperty('--sat', '44px'); document.documentElement.style.setProperty('--sab', '34px'); }
    }, tw).catch(() => {});
    await wait(300);
    await dismissModal(page);
  } else {
    await page.evaluate((id) => window.game.ctx.ui.shell.go(id), s);
    await wait(1100); // the screen change animation must be finished before we measure
    await dismissModal(page);
  }
  // Stop pulses and slides while measuring: a button that pulses looks a few pixels bigger and falsely closes a gap.
  await page.evaluate(() => { if (!document.getElementById('l1-freeze')) { const st = document.createElement('style'); st.id = 'l1-freeze'; st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); } });
  await wait(150);
  problems = (await page.evaluate(`(${auditSrc})()`)).filter((p) => !p.startsWith('note:'));
  problems.push(...await page.evaluate(`(${extra.toString()})(${JSON.stringify(s)})`));
  await page.screenshot({ path: `${SHOTS}/${tag}.png` });
  return { screen: s, size: `${w}x${h}`, twist: tw, problems };
}

const twistRuns = twistList.includes('rotate') && twistList.length === 1 ? [] : twistList.filter((t) => t !== 'rotate');
for (const tw of twistRuns) {
  const useSizes = tw.startsWith('zoom') ? [[1440, 900], [1024, 768]] : tw === 'none' ? sizes : (args.sizes ? sizes : KEY);
  for (const [w, h] of useSizes) {
    const page = await openPage(w, h, tw, '');
    for (const s of screens) {
      try { results.push(await runScreen(page, s, w, h, tw)); } catch (e) { results.push({ screen: s, size: `${w}x${h}`, twist: tw, problems: ['RUNNER ERROR ' + String(e).slice(0, 120)] }); }
    }
    await page.close().catch(() => {});
  }
}
if (twistList.includes('rotate')) {
  for (const [w, h] of (args.sizes ? sizes : KEY).filter(([a, b]) => a < 900 && a < b)) {
    const page = await openPage(w, h, 'none', '');
    await dismissModal(page);
    for (const s of screens.filter((x) => !['welcome', 'drop', 'results'].includes(x))) {
      await page.evaluate((id) => window.game.ctx.ui.shell.go(id), s); await wait(500);
      const before = await page.evaluate(() => document.querySelector('.screen')?.dataset?.screen || document.querySelector('.tabbar [aria-current="page"]')?.textContent || document.title);
      const before2 = await page.evaluate(() => window.game.ctx.ui.shell.current ? 1 : 0).catch(() => 0);
      await page.setViewport({ width: h, height: w, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await wait(600);
      const side = (await page.evaluate(`(${auditSrc})()`)).filter((p) => !p.startsWith('note:'));
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await wait(600);
      const back = (await page.evaluate(`(${auditSrc})()`)).filter((p) => !p.startsWith('note:'));
      const after = await page.evaluate(() => document.querySelector('.screen')?.dataset?.screen || document.querySelector('.tabbar [aria-current="page"]')?.textContent || document.title);
      const problems = [...side.map((p) => 'sideways: ' + p), ...back.map((p) => 'back: ' + p)];
      if (before !== after) problems.push(`STATE LOST on rotate: "${before}" -> "${after}"`);
      void before2;
      results.push({ screen: s, size: `${w}x${h} rotate`, twist: 'rotate', problems });
    }
    await page.close().catch(() => {});
  }
}
await browser.close();

let bad = 0;
for (const r of results) {
  const uniq = [...new Set(r.problems)];
  r.problems = uniq;
  if (uniq.length) { bad++; console.log(`FAIL ${r.screen} ${r.size} [${r.twist}]`); for (const p of uniq.slice(0, 10)) console.log('   - ' + p); if (uniq.length > 10) console.log(`   ... and ${uniq.length - 10} more`); }
}
console.log(`\n${results.length - bad} PASS, ${bad} FAIL out of ${results.length} checks (fixture ${FIXTURE})`);
if (consoleProblems.size) { console.log('\nCONSOLE:'); for (const c of consoleProblems) console.log('  ' + c); } else console.log('Console: no errors or warnings');
if (args.out) writeFileSync(args.out, JSON.stringify({ fixture: FIXTURE, results, console: [...consoleProblems] }, null, 1));
