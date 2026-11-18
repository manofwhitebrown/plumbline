// Rewards: the daily streak. Meta decides everything (clock safety lives there). We only show it.
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { fmt, fmtTime, buzz, ui } from '../soft.js';

export const ALREADY_TEXT = 'You already claimed today. Come back tomorrow.';
export const CLAIM_FAIL_TEXT = "Couldn't claim your reward. Try again.";

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// Pure: turn meta.daily.state() into what we draw. Bad input gives a safe empty view.
export function dailyView(state) {
  const st = state && typeof state === 'object' ? state : {};
  const rewards = Array.isArray(st.rewards) ? st.rewards : [];
  const canClaim = !!st.canClaim;
  const streak = Math.max(0, Math.floor(num(st.streak)));
  const day = Math.min(7, Math.max(1, Math.floor(num(st.day)) || 1));
  const slots = rewards.slice(0, 7).map((r, i) => {
    const d = Math.floor(num(r && r.day)) || i + 1;
    const status = r && (r.status === 'claimed' || r.status === 'next') ? r.status : 'upcoming';
    // Today is the slot you can claim now, or the one you claimed today.
    const isToday = canClaim ? status === 'next' : (streak > 0 && d === ((streak - 1) % 7) + 1);
    return { day: d, status, shards: Math.max(0, num(r && r.shards)), gold: Math.max(0, num(r && r.gold)), isToday };
  });
  const reward = st.reward && typeof st.reward === 'object' ? st.reward : {};
  return {
    slots, canClaim, streak, day,
    reward: { shards: Math.max(0, num(reward.shards)), gold: Math.max(0, num(reward.gold)) },
    nextInMs: Math.max(0, num(st.nextInMs)),
    title: canClaim ? 'Day ' + day + ' reward is ready' : 'Claimed today',
    sub: streak > 0 && !canClaim ? 'Streak: ' + streak + (streak === 1 ? ' day' : ' days') : 'Come back every day to grow your streak.',
  };
}

// Pure: what the Claim button says.
export function claimButtonView(view) {
  if (view.canClaim) {
    return { label: 'Claim Day ' + view.day, sub: '+' + fmt(view.reward.shards) + ' Shards, +' + fmt(view.reward.gold) + ' Gold', disabled: false, reason: '' };
  }
  const wait = view.nextInMs > 0 ? 'Come back tomorrow · ' + fmtTime(view.nextInMs) : 'Come back tomorrow';
  return { label: 'Claimed', sub: wait, disabled: true, reason: ALREADY_TEXT };
}

// Pure: the toast for a claim result. Text stays under 60 characters.
export function claimMessage(res) {
  if (res && res.ok) {
    const day = Math.floor(num(res.day));
    const parts = [];
    if (num(res.shards) > 0) parts.push('+' + fmt(res.shards) + ' Shards');
    if (num(res.gold) > 0) parts.push('+' + fmt(res.gold) + ' Gold');
    return { ok: true, kind: 'ok', text: (day > 0 ? 'Day ' + day + ' claimed: ' : 'Claimed: ') + (parts.join(', ') || 'a reward') };
  }
  const err = res && typeof res.error === 'string' ? res.error : '';
  if (/already/i.test(err)) return { ok: false, kind: 'warn', text: ALREADY_TEXT };
  return { ok: false, kind: 'warn', text: CLAIM_FAIL_TEXT };
}

// Show the result: toast, sound and haptic. Never silent, never throws.
export function announce(toast, msg, successSound) {
  try {
    if (typeof toast === 'function') toast(msg.text, msg.kind);
  } catch (e) { /* ignore */ }
  if (msg.ok) { ui(successSound || 'claim'); buzz('collect'); } else { ui('deny'); buzz('warn'); }
}

function slotEl(s) {
  const cls = 'rw-slot ' + s.status + (s.isToday ? ' today' : '') + (s.day === 7 ? ' big' : '');
  const el = h('div', { class: cls, role: 'listitem', 'aria-label': 'Day ' + s.day + ', ' + fmt(s.shards) + ' Shards, ' + fmt(s.gold) + ' Gold' + (s.status === 'claimed' ? ', claimed' : '') });
  el.append(h('span', { class: 'rw-day', text: 'Day ' + s.day }));
  if (s.status === 'claimed') el.append(svg(iconHtml('check'), 'rw-check'));
  el.append(h('span', { class: 'rw-amt shard' }, svg(iconHtml('shard')), h('span', { class: 'num', text: fmt(s.shards) })));
  el.append(h('span', { class: 'rw-amt gold' }, svg(iconHtml('gold')), h('span', { class: 'num', text: fmt(s.gold) })));
  return el;
}

// ctx: { meta, toast, scope, onChange }  ->  { el, update() }
export function buildDaily(ctx) {
  const { meta, toast, scope } = ctx;
  const grid = h('div', { class: 'rw-slots', role: 'list', 'aria-label': 'Daily reward days' });
  const title = h('h2', { class: 'title ellipsis' });
  const sub = h('p', { class: 'sub' });
  const btn = button({ label: 'Claim', kind: 'primary', big: true, onPress: claim, onDeny: (r) => { try { if (typeof toast === 'function') toast(r, 'warn'); } catch (e) { /* ignore */ } } }, scope);
  const el = h('section', { class: 'card rw-daily', 'aria-label': 'Daily reward' },
    h('div', { class: 'rw-head' }, svg(iconHtml('gift')), h('div', { class: 'grow' }, title, sub)), grid, btn);
  let sig = '';

  function read() {
    try { return dailyView(meta.daily.state()); } catch (e) { return dailyView(null); }
  }

  function claim() {
    let res = null;
    try { res = meta.daily.claim(); } catch (e) { res = { ok: false, error: 'failed' }; }
    const msg = claimMessage(res);
    announce(toast, msg, 'claim');
    if (!msg.ok) btn.classList.add('shake');
    update();
    if (typeof ctx.onChange === 'function') ctx.onChange();
  }

  function update() {
    const v = read();
    const next = JSON.stringify(v);
    if (next === sig) return;
    sig = next;
    title.textContent = v.title;
    sub.textContent = v.sub;
    grid.textContent = '';
    for (const s of v.slots) grid.append(slotEl(s));
    const b = claimButtonView(v);
    btn.setState({ label: b.label, sub: b.sub, disabled: b.disabled, reason: b.reason, kind: v.canClaim ? 'primary' : 'secondary' });
    btn.classList.toggle('pulse', v.canClaim);
  }
  update();
  return { el, update };
}
