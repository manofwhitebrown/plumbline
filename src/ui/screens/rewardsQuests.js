// Rewards: today's 3 quests. Meta picks them and counts progress. We show and claim.
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { progress } from '../components/progress.js';
import { fmt } from '../soft.js';
import { announce } from './rewardsDaily.js';

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

// Pure: meta.quests.list() -> view. Bad input gives an empty list.
export function questsView(list) {
  const items = (Array.isArray(list) ? list : []).filter((q) => q && typeof q.id === 'string').map((q) => {
    const target = Math.max(1, num(q.target));
    const prog = Math.min(target, Math.max(0, num(q.progress)));
    const state = q.claimed ? 'claimed' : (q.canClaim || q.done) ? 'ready' : 'active';
    return {
      id: q.id, text: String(q.text || 'Quest').slice(0, 60), state,
      fraction: Math.min(1, prog / target), label: fmt(prog) + ' / ' + fmt(target),
      shards: Math.max(0, num(q.shards)),
    };
  });
  const claimed = items.filter((q) => q.state === 'claimed').length;
  const ready = items.filter((q) => q.state === 'ready').length;
  const doneCount = claimed + ready; // finished, claimed or not
  const sub = !items.length ? 'No quests right now.'
    : claimed === items.length ? 'All done. New quests tomorrow.'
    : ready ? ready + (ready === 1 ? ' quest is ready to claim.' : ' quests are ready to claim.')
    : 'New quests every day.';
  return { items, claimed, ready, doneCount, total: items.length, sub };
}

// Pure: toast for a quest claim.
export function questClaimMessage(res) {
  if (res && res.ok) return { ok: true, kind: 'ok', text: 'Quest done: +' + fmt(num(res.shards)) + ' Shards' };
  const err = res && typeof res.error === 'string' ? res.error : '';
  if (/already/i.test(err)) return { ok: false, kind: 'warn', text: 'You already claimed that quest.' };
  if (/not finished/i.test(err)) return { ok: false, kind: 'warn', text: 'Not finished yet. Keep going.' };
  if (/no such/i.test(err)) return { ok: false, kind: 'warn', text: 'That quest is gone. New ones come tomorrow.' };
  return { ok: false, kind: 'warn', text: "Couldn't claim the quest. Try again." };
}

function questEl(q, onClaim, scope) {
  const bar = progress(q.fraction, q.text);
  const right = q.state === 'ready'
    ? button({ label: 'Claim', kind: 'primary', onPress: () => onClaim(q.id), aria: 'Claim ' + q.text }, scope)
    : q.state === 'claimed'
      ? h('span', { class: 'rw-done' }, svg(iconHtml('check')), h('span', { text: 'Claimed' }))
      : h('span', { class: 'pill shard', 'aria-label': fmt(q.shards) + ' Shards' }, svg(iconHtml('shard')), h('span', { class: 'num', text: '+' + fmt(q.shards) }));
  const el = h('li', { class: 'rw-quest ' + q.state },
    h('div', { class: 'rw-quest-top' },
      h('div', { class: 'grow' }, h('p', { class: 'rw-qtext', text: q.text }), h('p', { class: 'sub num', text: q.label })),
      right),
    bar);
  if (q.state === 'ready') bar.classList.add('ok');
  return el;
}

// ctx: { meta, toast, scope, onChange } -> { el, update() }
export function buildQuests(ctx) {
  const { meta, toast, scope } = ctx;
  const count = h('span', { class: 'pill num' });
  const sub = h('p', { class: 'sub' });
  const list = h('ul', { class: 'rw-list', 'aria-label': 'Daily quests' });
  const el = h('section', { class: 'card rw-quests', 'aria-label': 'Daily quests' },
    h('div', { class: 'rw-head' }, h('div', { class: 'grow' }, h('h2', { class: 'title', text: 'Daily quests' }), sub), count), list);
  let sig = '';

  function read() {
    try { return questsView(meta.quests.list()); } catch (e) { return questsView(null); }
  }
  function claim(id) {
    let res = null;
    try { res = meta.quests.claim(id); } catch (e) { res = { ok: false, error: 'failed' }; }
    announce(toast, questClaimMessage(res), 'claim');
    update();
    if (typeof ctx.onChange === 'function') ctx.onChange();
  }
  function update() {
    const v = read();
    const next = JSON.stringify(v);
    if (next === sig) return;
    sig = next;
    count.textContent = v.doneCount + ' / ' + v.total + ' done';
    sub.textContent = v.sub;
    list.textContent = '';
    if (!v.items.length) list.append(h('li', { class: 'sub', text: 'No quests here yet. Check back tomorrow.' }));
    for (const q of v.items) list.append(questEl(q, claim, scope));
  }
  update();
  return { el, update };
}
