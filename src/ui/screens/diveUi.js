// Rewards: the Daily Dive card. Meta (src/meta/dive.js) decides everything; we show it and start the Drop.
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { fmt, fmtDepth, fmtTime, buzz, ui } from '../soft.js';
import { api } from '../api.js';
import { go } from '../shell.js';
import * as D from '../../meta/dive.js';
import { announce } from './rewardsDaily.js';

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// Pure: meta state -> what we draw. Bad input gives a safe closed card.
export function diveView(state) {
  const st = state && typeof state === 'object' ? state : {};
  const chest = st.chest && typeof st.chest === 'object' ? st.chest : {};
  const streak = Math.max(0, Math.floor(num(st.streak)));
  const canPlay = !!st.canPlay;
  const running = !!st.running;
  const nextInMs = Math.max(0, num(st.nextInMs));
  let btn;
  if (canPlay) btn = { label: 'Start Dive', sub: 'One free try', disabled: false, reason: '' };
  else if (running) btn = { label: 'Dive going', sub: 'Finish it to see your result', disabled: true, reason: 'Your Dive is going.' };
  else if (st.tried) btn = { label: 'Done for today', sub: 'Next Dive in ' + fmtTime(nextInMs), disabled: true, reason: 'A new Dive comes tomorrow.' };
  else btn = { label: 'Locked', sub: String(st.why || 'Finish 3 Drops to unlock.').slice(0, 60), disabled: true, reason: String(st.why || 'Finish 3 Drops to unlock.') };
  const chestState = chest.state === 'ready' || chest.state === 'claimed' ? chest.state : 'none';
  return {
    twistName: String(st.twistName || 'Daily twist').slice(0, 24), twistDesc: String(st.twistDesc || '').slice(0, 90),
    best: st.tried || num(st.best) > 0 ? fmtDepth(num(st.best)) : '-', allTimeBest: num(st.allTimeBest) > 0 ? fmtDepth(num(st.allTimeBest)) : '-',
    streakText: streak === 1 ? '1 day' : streak + ' days', streak, btn,
    chest: { state: chestState, name: String(chest.name || 'Chest').slice(0, 22), shards: Math.max(0, num(chest.shards)), gold: Math.max(0, num(chest.gold)) },
  };
}

export function chestMessage(res) {
  if (res && res.ok) {
    const parts = [];
    if (num(res.shards) > 0) parts.push('+' + fmt(res.shards) + ' Shards');
    if (num(res.gold) > 0) parts.push('+' + fmt(res.gold) + ' Gold');
    return { ok: true, kind: 'ok', text: 'Chest opened: ' + parts.join(', ') };
  }
  return { ok: false, kind: 'warn', text: /already/i.test(String(res && res.error)) ? 'You already opened today\u2019s chest.' : "Couldn't open the chest. Try again." };
}

// Start the Dive: switch on today's twist for this Drop, then start the normal Drop with the fixed seed.
// The result then shows on the normal Results screen.
export function startDive(toast) {
  const say = (t) => { try { if (typeof toast === 'function') toast(t, 'warn'); } catch (e) { /* ignore */ } };
  try {
    const session = api.session;
    if (typeof session.isRunning === 'function' && session.isRunning()) { say('A Drop is already going.'); return false; }
    const b = D.begin();
    if (!b.ok) { say(b.error || 'The Dive is not open.'); return false; }
    let r = null;
    try { r = session.start({ ...b.options }); } catch (e) { r = null; }
    if (!r || !r.ok) { D.cancel(); say((r && r.error) || 'Could not start the Dive. Try again.'); return false; }
    buzz('tap'); ui('open');
    return go('drop');
  } catch (e) {
    try { D.cancel(); } catch (err) { /* ignore */ }
    say('Could not start the Dive. Try again.');
    return false;
  }
}

// ctx: { toast, scope, onChange } -> { el, update() }
export function buildDive(ctx) {
  const { toast, scope } = ctx;
  const twistName = h('p', { class: 'dv-twist-name ellipsis' });
  const twistDesc = h('p', { class: 'sub' });
  const best = h('span', { class: 'num' });
  const streak = h('span', { class: 'num' });
  const sub = h('p', { class: 'sub', text: 'One fixed Drop a day. Same for everyone.' });
  const startBtn = button({ label: 'Start Dive', kind: 'primary', big: true, onPress: () => { startDive(toast); }, onDeny: (r) => { try { toast(r, 'warn'); } catch (e) { /* ignore */ } } }, scope);
  const chestTitle = h('p', { class: 'rw-qtext' });
  const chestSub = h('p', { class: 'sub' });
  const chestBtn = button({ label: 'Open chest', kind: 'primary', onPress: openChest }, scope);
  const chestRow = h('div', { class: 'dv-chest' }, svg(iconHtml('chest')), h('div', { class: 'grow' }, chestTitle, chestSub), chestBtn);
  const el = h('section', { class: 'card dv-card', 'aria-label': 'Daily Dive' },
    h('div', { class: 'rw-head' }, svg(iconHtml('star')), h('div', { class: 'grow' }, h('h2', { class: 'title', text: 'Daily Dive' }), sub)),
    h('div', { class: 'dv-twist' }, h('p', { class: 'sub', text: 'Today\u2019s twist' }), twistName, twistDesc),
    h('div', { class: 'dv-stats' },
      h('div', { class: 'dv-stat' }, h('span', { class: 'sub', text: 'Best today' }), best),
      h('div', { class: 'dv-stat' }, h('span', { class: 'sub', text: 'Streak' }), streak)),
    startBtn, chestRow);
  let sig = '';
  const read = () => { try { return diveView(D.state()); } catch (e) { return diveView(null); } };

  function openChest() {
    let res = null;
    try { res = D.claimChest(); } catch (e) { res = { ok: false, error: 'failed' }; }
    announce(toast, chestMessage(res), 'claim');
    update();
    if (typeof ctx.onChange === 'function') ctx.onChange();
  }
  function update() {
    const v = read();
    const next = JSON.stringify(v);
    if (next === sig) return;
    sig = next;
    twistName.textContent = v.twistName;
    twistDesc.textContent = v.twistDesc;
    best.textContent = v.best;
    streak.textContent = v.streakText;
    startBtn.setState({ label: v.btn.label, sub: v.btn.sub, disabled: v.btn.disabled, reason: v.btn.reason, kind: v.btn.disabled ? 'secondary' : 'primary' });
    startBtn.classList.toggle('pulse', !v.btn.disabled);
    chestRow.hidden = v.chest.state === 'none';
    chestTitle.textContent = v.chest.state === 'claimed' ? 'Chest opened' : v.chest.name;
    chestSub.textContent = v.chest.state === 'claimed' ? 'Come back tomorrow.' : '+' + fmt(v.chest.shards) + ' Shards, +' + fmt(v.chest.gold) + ' Gold';
    chestBtn.hidden = v.chest.state !== 'ready';
  }
  update();
  return { el, update };
}
