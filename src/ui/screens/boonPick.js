// The boon picker: three cards, a timer ring, thumb-friendly. Pick one or the middle card is taken when time runs out.
// cb: { onPick(id|null) -> { ok } }. The drop is paused by the game while this is open.
import { h } from '../dom.js';
import { cardModel, secondsLeft } from '../logic/playModel.js';
import { getSettings } from '../settings.js';
import { buzz } from '../../platform/haptics.js';
import { ui } from '../soft.js';

const RING = 2 * Math.PI * 17;

export function createBoonPicker(cb, scope) {
  const title = h('h2', { class: 'bp-title', text: 'Pick a boon' });
  const sub = h('p', { class: 'bp-sub' });
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 40 40'); ring.setAttribute('class', 'bp-ring'); ring.setAttribute('aria-hidden', 'true');
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', '20'); bg.setAttribute('cy', '20'); bg.setAttribute('r', '17'); bg.setAttribute('class', 'bp-ring-bg');
  const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fg.setAttribute('cx', '20'); fg.setAttribute('cy', '20'); fg.setAttribute('r', '17'); fg.setAttribute('class', 'bp-ring-fg');
  fg.style.strokeDasharray = String(RING);
  ring.append(bg, fg);
  const secs = h('span', { class: 'num bp-secs', 'aria-hidden': 'true' });
  const timer = h('div', { class: 'bp-timer' }, ring, secs);
  const list = h('div', { class: 'bp-cards', role: 'group', 'aria-label': 'Boons' });
  const el = h('div', { class: 'bp', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Pick a boon' },
    h('div', { class: 'bp-panel' }, h('div', { class: 'bp-head' }, h('div', {}, title, sub), timer), list));

  let open = false, offer = null, started = 0, tick = 0, cards = [];

  function finish(id) {
    if (!open) return;
    let res = null;
    try { res = cb.onPick(id); } catch (e) { res = null; }
    if (res && res.ok === false) return; // junk id: keep the picker open
    close();
  }

  function paint() {
    const left = secondsLeft(started, Date.now(), offer.seconds);
    secs.textContent = String(Math.ceil(left));
    fg.style.strokeDashoffset = String(RING * (1 - left / Math.max(1, offer.seconds)));
    if (left <= 0) { finish(null); }
  }

  function show(o) {
    if (!o || !Array.isArray(o.options) || !o.options.length) return;
    offer = o; open = true; started = Date.now();
    const merchant = o.kind === 'merchant';
    title.textContent = merchant ? 'Merchant Lantern' : 'Pick a boon';
    sub.textContent = merchant ? 'Spend gold from the bucket, or walk on.' : 'It lasts for this drop.';
    list.textContent = ''; cards = [];
    o.options.forEach((opt, i) => {
      const m = cardModel(opt);
      const b = h('button', { class: 'bp-card r-' + m.rarity + (i === o.mid ? ' mid' : ''), type: 'button', 'data-id': m.id, 'aria-label': m.name + '. ' + m.rarityLabel + '. ' + m.desc },
        h('span', { class: 'bp-top' }, h('b', { class: 'bp-name ellipsis', text: m.name }), h('i', { class: 'bp-rar', text: m.rarityLabel })),
        h('span', { class: 'bp-desc', text: m.desc }),
        h('span', { class: 'bp-meta' }, ...m.tags.map((t) => h('em', { class: 'bp-tag', text: t.label })), m.boost ? h('em', { class: 'bp-boost', text: m.boost }) : null, m.cost ? h('em', { class: 'bp-cost', text: m.cost + ' Gold' }) : null),
        h('span', { class: 'bp-key', 'aria-hidden': 'true', text: String(i + 1) }));
      scope.on(b, 'click', () => { buzz('tap'); ui('tap'); finish(m.id); });
      cards.push(b); list.append(b);
    });
    el.hidden = false;
    paint();
    clearInterval(tick); tick = setInterval(paint, getSettings().reduceMotion ? 250 : 100);
    try { cards[Math.min(o.mid, cards.length - 1)].focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  function close() { open = false; offer = null; clearInterval(tick); tick = 0; el.hidden = true; }
  function pickIndex(i) { if (open && cards[i]) { finish(cards[i].getAttribute('data-id')); return true; } return false; }

  scope.add(() => { clearInterval(tick); });
  return { el, show, close, isOpen: () => open, pickIndex };
}
