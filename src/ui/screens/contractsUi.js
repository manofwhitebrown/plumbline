// Rewards: Contracts. Three at a time, with progress bars. Meta (src/meta/contracts.js) owns every number.
import { h, svg } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { progress } from '../components/progress.js';
import { fmt } from '../soft.js';
import * as C from '../../meta/contracts.js';
import { announce } from './rewardsDaily.js';
import { countText } from '../../core/plural.js';

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// Pure: meta list -> what we draw. Bad input gives an empty list.
export function contractsView(list) {
  const items = (Array.isArray(list) ? list : []).filter((c) => c && typeof c.id === 'string').map((c) => {
    const target = Math.max(1, num(c.target));
    const prog = Math.min(target, Math.max(0, num(c.progress)));
    const rw = c.reward && typeof c.reward === 'object' ? c.reward : {};
    return {
      id: c.id, text: String(c.text || 'Contract').slice(0, 28),
      state: c.done ? 'ready' : 'active',
      fraction: Math.min(1, prog / target), label: fmt(prog) + ' / ' + fmt(target),
      rewardType: rw.type === 'gold' ? 'gold' : 'shards', rewardAmount: Math.max(0, num(rw.amount)),
    };
  });
  const ready = items.filter((c) => c.state === 'ready').length;
  const sub = !items.length ? 'No contracts right now.'
    : ready ? ready + (ready === 1 ? ' contract is ready to claim.' : ' contracts are ready to claim.')
      : 'A new one comes when you finish one.';
  return { items, ready, sub };
}

export function rewardPillText(c) { return '+' + fmt(c.rewardAmount); }

// Pure: toast for a claim. Under 60 characters.
export function contractClaimMessage(res) {
  if (res && res.ok && res.reward) {
    const unit = res.reward.type === 'gold' ? 'Gold' : 'Shards';
    return { ok: true, kind: 'ok', text: 'Contract done: +' + fmt(num(res.reward.amount)) + ' ' + unit };
  }
  const err = res && typeof res.error === 'string' ? res.error : '';
  if (/not finished/i.test(err)) return { ok: false, kind: 'warn', text: 'Not finished yet. Keep going.' };
  if (/no such/i.test(err)) return { ok: false, kind: 'warn', text: 'That contract is gone. Pick another.' };
  return { ok: false, kind: 'warn', text: "Couldn't claim the contract. Try again." };
}

function itemEl(c, onClaim, scope) {
  const bar = progress(c.fraction, c.text);
  const right = c.state === 'ready'
    ? button({ label: 'Claim', kind: 'primary', onPress: () => onClaim(c.id), aria: 'Claim ' + c.text }, scope)
    : h('span', { class: 'pill ' + (c.rewardType === 'gold' ? 'gold' : 'shard'), 'aria-label': (c.rewardType === 'gold' ? fmt(c.rewardAmount) + ' Gold' : countText(c.rewardAmount, 'Shard')) },
      svg(iconHtml(c.rewardType === 'gold' ? 'gold' : 'shard')), h('span', { class: 'num', text: rewardPillText(c) }));
  if (c.state === 'ready') bar.classList.add('ok');
  return h('li', { class: 'rw-quest ' + c.state, 'data-contract': c.id },
    h('div', { class: 'rw-quest-top' },
      h('div', { class: 'grow' }, h('p', { class: 'rw-qtext', text: c.text }), h('p', { class: 'sub num', text: c.label })),
      right),
    bar);
}

// ctx: { toast, scope, onChange } -> { el, update() }
export function buildContracts(ctx) {
  const { toast, scope } = ctx;
  const count = h('span', { class: 'pill num' });
  const sub = h('p', { class: 'sub' });
  const list = h('ul', { class: 'rw-list', 'aria-label': 'Contracts' });
  const el = h('section', { class: 'card rw-contracts', 'aria-label': 'Contracts' },
    h('div', { class: 'rw-head' }, h('div', { class: 'grow' }, h('h2', { class: 'title', text: 'Contracts' }), sub), count), list);
  let sig = '';
  const read = () => { try { return contractsView(C.list()); } catch (e) { return contractsView(null); } };
  function claim(id) {
    let res = null;
    try { res = C.claim(id); } catch (e) { res = { ok: false, error: 'failed' }; }
    announce(toast, contractClaimMessage(res), 'claim');
    update();
    if (typeof ctx.onChange === 'function') ctx.onChange();
  }
  function update() {
    const v = read();
    const next = JSON.stringify(v);
    if (next === sig) return;
    sig = next;
    sub.textContent = v.sub;
    count.textContent = v.ready ? v.ready + ' ready' : String(v.items.length);
    list.textContent = '';
    for (const c of v.items) list.append(itemEl(c, claim, scope));
  }
  update();
  return { el, update };
}
