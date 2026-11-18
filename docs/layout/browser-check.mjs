// Browser layout audit (NEW-8). Opens the running game in headless Chrome at every size and twist
// and looks for the failures in docs/manager/LAYOUT_CHECK.md section 2.
//
// How to run (puppeteer-core is NOT a project dependency, so install it without saving):
//   npm i --no-save puppeteer-core
//   npm run dev -- --port 5199 &
//   CHROME=/usr/bin/google-chrome node docs/layout/browser-check.mjs [--screens home,rig] [--fixture extreme] [--twist large,zoom125,notch,rotate,reduce] [--sizes all|small|one]
// Output: one line per problem, a PASS/FAIL table, and screenshots in /tmp/plumbline-shots.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const BASE = args.base || 'http://localhost:5199/';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const FIXTURE = args.fixture || '';
const SHOTS = '/tmp/plumbline-shots';
mkdirSync(SHOTS, { recursive: true });

const SIZES = [
  [320, 568], [360, 640], [375, 667], [360, 780], [390, 844], [412, 915], [430, 932],
  [768, 1024], [844, 390], [1024, 768], [1440, 900], [1920, 1080],
];
const KEY = [[360, 640], [390, 844], [1440, 900]];
const sizes = args.sizes === 'key' ? KEY : args.sizes === 'one' ? [[390, 844]] : SIZES;
const TABS = { home: 0, rig: 1, crew: 2, workshop: 3, codex: 4, more: 5 };
const screens = (args.screens || 'home,rig,crew,workshop').split(',');
const twists = (args.twist || '').split(',').filter(Boolean);

// This runs inside the page. It returns a list of problem strings.
function audit() {
  const out = [];
  const vw = window.innerWidth; const vh = window.innerHeight;
  const doc = document.documentElement;
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0, 3).join('.');
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    return t ? `${s} "${t}"` : s;
  };
  // Is the element really on screen? Content scrolled out of its scroll box or hidden behind the tab bar does not count.
  const clipY = (el) => {
    const r = el.getBoundingClientRect();
    let top = r.top; let bottom = r.bottom;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowY)) {
        const pr = p.getBoundingClientRect();
        top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom);
      }
    }
    return bottom - top > 1;
  };
  // The part of the element that can really be seen (vertical clipping only).
  const crect = (el) => {
    const r = el.getBoundingClientRect();
    let top = r.top; let bottom = r.bottom;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowY)) {
        const pr = p.getBoundingClientRect();
        top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom);
      }
    }
    return { left: r.left, right: r.right, top, bottom };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    return clipY(el);
  };
  // Sticky or fixed bars sit on top of content on purpose, so pairs with them are not overlaps.
  const inOverlay = (el) => {
    for (let p = el; p && p.id !== 'app'; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === 'sticky' || pos === 'fixed') return true;
    }
    return false;
  };
  const insideScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) return true;
      if (p.id === 'app') break;
    }
    return false;
  };
  if (doc.scrollWidth > doc.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1) out.push('SIDEWAYS SCROLL on the page');
  const root = document.querySelector('#app') || document.body;
  const all = [...root.querySelectorAll('*')].filter(visible).filter((el) => !el.closest('svg') || el.tagName.toLowerCase() === 'svg');
  // 1 and 2: things outside the screen, text cut off
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !insideScroller(el)) out.push(`OUTSIDE SCREEN ${desc(el)} (left ${Math.round(r.left)}, right ${Math.round(r.right)}, screen ${vw})`);
    const cs = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && /(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis') out.push(`TEXT CUT OFF ${desc(el)} (${el.scrollWidth} > ${el.clientWidth})`);
    if (hasText && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(`note: text ends with … ${desc(el)}`);
    if (hasText && /(hidden|clip)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && cs.display !== 'inline') out.push(`TEXT CUT OFF (height) ${desc(el)} (${el.scrollHeight} > ${el.clientHeight})`);
    // 5: small text
    if (hasText && parseFloat(cs.fontSize) < 12) out.push(`SMALL TEXT ${desc(el)} ${cs.fontSize}`);
  }
  // 4: tap targets
  const tapSel = 'button, [role="button"], [role="tab"], a[href], input, select, textarea, summary, .btn, .chip, .partcard, .rig-cell, [tabindex]:not([tabindex="-1"])';
  const taps = [...root.querySelectorAll(tapSel)].filter(visible).filter((el) => !el.closest('[hidden]') && getComputedStyle(el).pointerEvents !== 'none');
  for (const el of taps) {
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.push(`SMALL TAP TARGET ${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  for (let i = 0; i < taps.length; i++) {
    for (let j = i + 1; j < taps.length; j++) {
      const a = taps[i]; const b = taps[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (inOverlay(a) !== inOverlay(b)) continue;
      // The tab bar is a segmented bar: its tabs touch on purpose (see docs/layout/NEW-8.md).
      if (a.closest('.tabbar') && b.closest('.tabbar')) continue;
      // Anything in a scroll box can stop at any height next to the tab bar. That is scrolling, not a gap problem.
      // (We check separately that the last item can be scrolled clear of the tab bar.)
      if ((a.closest('.tabbar') || b.closest('.tabbar')) && (a.closest('.screen-host') || b.closest('.screen-host'))) continue;
      const ra = crect(a); const rb = crect(b);
      const dx = Math.max(rb.left - ra.right, ra.left - rb.right, 0);
      const dy = Math.max(rb.top - ra.bottom, ra.top - rb.bottom, 0);
      const gap = Math.hypot(dx, dy);
      if (gap < 7.5) out.push(`TAP TARGETS TOO CLOSE ${Math.round(gap * 10) / 10}px: ${desc(a)} / ${desc(b)}`);
    }
  }
  // 3 and 6: last item reachable, nothing hidden behind the tab bar
  const host = document.querySelector('.screen-host');
  const screen = document.querySelector('.screen-host .screen');
  const tabbar = document.querySelector('.tabbar');
  if (screen && host) {
    screen.scrollTop = screen.scrollHeight;
    const hr = host.getBoundingClientRect();
    const kids = [...screen.children].filter(visible).filter((k) => getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed' && getComputedStyle(k).position !== 'sticky');
    const last = kids[kids.length - 1];
    if (last) {
      const lr = last.getBoundingClientRect();
      if (lr.bottom > hr.bottom + 1) out.push(`LAST ITEM NOT REACHABLE ${desc(last)} bottom ${Math.round(lr.bottom)} > ${Math.round(hr.bottom)}`);
    }
    if (tabbar) {
      const tb = tabbar.getBoundingClientRect();
      for (const el of taps) {
        if (tabbar.contains(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom > tb.top + 1 && r.top < tb.bottom && !el.closest('.layer')) out.push(`HIDDEN BEHIND TAB BAR ${desc(el)}`);
      }
    }
    screen.scrollTop = 0;
  }
  // Rows that scroll sideways but are squashed shorter than their own items (a flex column can shrink them)
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowX) && !el.classList.contains('screen')) {
      for (const k of el.children) {
        const kr = k.getBoundingClientRect();
        if (kr.height > el.clientHeight + 2 && getComputedStyle(k).display !== 'none') { out.push(`ROW SQUASHED ${desc(el)} is ${el.clientHeight}px tall but ${desc(k)} needs ${Math.round(kr.height)}px`); break; }
      }
    }
  }
  // Things cut off by a box that does not scroll (overflow hidden), other than the app frame
  for (const el of all) {
    if (el.closest('svg') || !((el.textContent || '').trim() || el.matches(tapSel))) continue;
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.id === 'app' || p.classList.contains('app') || p.classList.contains('screen-host') || p.classList.contains('screen')) break;
      const cs = getComputedStyle(p);
      if (/(hidden|clip)/.test(cs.overflowY) && !/(auto|scroll)/.test(cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        if (r.bottom > pr.bottom + 1.5 || r.top < pr.top - 1.5) { out.push(`CUT OFF BY BOX ${desc(el)} sticks out of ${desc(p)}`); break; }
      }
    }
  }
  // Tap targets covered by a sticky bar at the top of the scroll (note only: they can be scrolled clear)
  const overlays = taps.filter(inOverlay);
  for (const el of taps) {
    if (inOverlay(el)) continue;
    const r = el.getBoundingClientRect();
    for (const o of overlays) {
      const orc = o.getBoundingClientRect();
      const ox = Math.min(r.right, orc.right) - Math.max(r.left, orc.left);
      const oy = Math.min(r.bottom, orc.bottom) - Math.max(r.top, orc.top);
      if (ox > 2 && oy > 2) { out.push(`note: partly covered by a sticky bar ${desc(el)} / ${desc(o)} (${Math.round(oy)}px)`); break; }
    }
  }
  // 10: the column on wide screens
  const app = document.querySelector('.app');
  if (app) {
    const r = app.getBoundingClientRect();
    if (vw >= 900 && r.width > 481) out.push(`COLUMN TOO WIDE ${Math.round(r.width)}px`);
    if (vw < 900 && vw <= 480 && Math.abs(r.width - vw) > 1) out.push(`COLUMN NOT FULL WIDTH ${Math.round(r.width)} of ${vw}`);
    if (r.height > vh + 1) out.push(`APP TALLER THAN SCREEN ${Math.round(r.height)} > ${vh}`);
  }
  // text overlapping other text (leaf elements only)
  const leaves = all.filter((el) => el.children.length === 0 && (el.textContent || '').trim());
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i]; const b = leaves[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (a.closest('svg') || b.closest('svg')) continue;
      if (inOverlay(a) !== inOverlay(b)) continue;
      const ra = crect(a); const rb = crect(b);
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 2 && oy > 2) out.push(`TEXT OVERLAP ${desc(a)} / ${desc(b)} (${Math.round(ox)}x${Math.round(oy)})`);
    }
  }
  return out;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const results = []; // { screen, size, twist, problems }
const consoleProblems = new Set();

async function openPage(w, h, twistList) {
  const zoom = twistList.includes('zoom125') ? 1.25 : twistList.includes('zoom150') ? 1.5 : 1;
  const page = await browser.newPage();
  const mobile = w <= 900 && !(w === 1024);
  await page.setViewport({ width: Math.round(w / zoom), height: Math.round(h / zoom), deviceScaleFactor: 2 * zoom, isMobile: mobile, hasTouch: mobile });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleProblems.add(`console ${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => consoleProblems.add('page error: ' + String(e).slice(0, 160)));
  if (twistList.includes('notch')) {
    const cdp = await page.createCDPSession();
    try { await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 44, bottom: 34, left: 0, right: 0 } }); } catch (e) { consoleProblems.add('notch emulation not available: ' + e.message); }
  }
  const url = BASE + '?debug=1' + (FIXTURE ? '&fixture=' + FIXTURE : '');
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.tabbar', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 700)); // splash fades out
  await page.evaluate((tw) => {
    const app = document.querySelector('#app');
    if (tw.includes('large')) { app.dataset.large = '1'; document.body.dataset.large = '1'; }
    if (tw.includes('reduce')) app.dataset.reduce = '1';
  }, twistList);
  return page;
}

async function gotoScreen(page, name) {
  if (name === 'home') { await page.evaluate(() => document.querySelectorAll('.tabbar button')[0].click()); }
  else if (name in TABS) await page.evaluate((i) => document.querySelectorAll('.tabbar button')[i].click(), TABS[name]);
  else await page.goto(BASE + `?debug=1&screen=${name}` + (FIXTURE ? '&fixture=' + FIXTURE : ''), { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 450));
}

const twistSets = [[]];
for (const t of twists) if (t !== 'rotate') twistSets.push([t]);
for (const tw of twistSets) {
  const useSizes = tw.length ? KEY : sizes;
  for (const [w, h] of useSizes) {
    const page = await openPage(w, h, tw);
    for (const s of screens) {
      await gotoScreen(page, s);
      const problems = (await page.evaluate(audit)).filter((p) => !p.startsWith('note:'));
      await page.screenshot({ path: `${SHOTS}/${s}-${w}x${h}${tw.length ? '-' + tw.join('+') : ''}${FIXTURE ? '-' + FIXTURE : ''}.png` });
      results.push({ screen: s, size: `${w}x${h}`, twist: tw.join('+') || '-', problems });
    }
    await page.close();
  }
}
if (twists.includes('rotate')) {
  for (const [w, h] of KEY.filter(([a]) => a < 900)) {
    const page = await openPage(w, h, []);
    for (const s of screens) {
      await gotoScreen(page, s);
      const before = await page.evaluate(() => document.querySelector('.tabbar [aria-current="page"]')?.textContent || '');
      await page.setViewport({ width: h, height: w, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await new Promise((r) => setTimeout(r, 500));
      const sideways = (await page.evaluate(audit)).filter((p) => !p.startsWith('note:'));
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await new Promise((r) => setTimeout(r, 500));
      const after = await page.evaluate(() => document.querySelector('.tabbar [aria-current="page"]')?.textContent || '');
      const back = (await page.evaluate(audit)).filter((p) => !p.startsWith('note:'));
      const problems = [...sideways.map((p) => 'sideways: ' + p), ...back.map((p) => 'back: ' + p)];
      if (before !== after) problems.push(`STATE LOST on rotate: "${before}" -> "${after}"`);
      results.push({ screen: s, size: `${w}x${h} rotate`, twist: 'rotate', problems });
    }
    await page.close();
  }
}
await browser.close();

let bad = 0;
for (const r of results) {
  const uniq = [...new Set(r.problems)];
  if (uniq.length) { bad++; console.log(`FAIL ${r.screen} ${r.size} [${r.twist}]`); for (const p of uniq.slice(0, 12)) console.log('   - ' + p); if (uniq.length > 12) console.log(`   ... and ${uniq.length - 12} more`); }
}
console.log(`\n${results.length - bad} PASS, ${bad} FAIL out of ${results.length} checks`);
if (consoleProblems.size) { console.log('\nCONSOLE:'); for (const c of consoleProblems) console.log('  ' + c); } else console.log('Console: no errors or warnings');
