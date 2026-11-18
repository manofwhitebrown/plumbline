// Workshop screen: two tabs. Parts (all parts by family) and Upgrades.
import { registerScreen } from '../shell.js';
import * as shell from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { pill } from '../components/pill.js';
import { api } from '../api.js';
import { bus, fmt, ui, buzz, log } from '../soft.js';
import { allCombos as allComboData } from '../../engine/parts/combos.js';
import { FAMILIES, FAMILY_NAMES, partCardEl, partSheetBody, failText } from './workshopParts.js';
import { upgradeCardEl } from './workshopUpgrades.js';
import '../styles/workshop.css';

let scope = null;

function shake(card) {
  if (!card || !card.classList) return;
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
}

function allCombos() {
  try { return allComboData(); } catch (e) { return []; }
}

registerScreen('workshop', {
  mount(el) {
    scope = createScope();
    let live = true;
    let tab = 'parts';
    let family = 'all';
    let sheet = null;
    let sheetId = null;
    const cards = new Map();
    const upCards = new Map();

    const goldPill = pill('0', 'gold', 'gold');
    const shardPill = pill('0', 'shard', 'shard');
    const corePill = pill('0', 'core', 'core');
    const wallet = h('div', { class: 'ws-wallet' }, goldPill, shardPill, corePill);

    const tabs = h('div', { class: 'ws-tabs', role: 'tablist' });
    const tabBtns = [['parts', 'Parts'], ['upgrades', 'Upgrades']].map(([id, label]) => {
      const b = h('button', { type: 'button', role: 'tab', class: 'btn ws-tab', text: label });
      scope.on(b, 'click', () => { tab = id; ui('tap'); render(); });
      tabs.append(b);
      return { id, b };
    });
    const chips = h('div', { class: 'ws-chips', role: 'group', 'aria-label': 'Part family' });
    const chipBtns = ['all', ...FAMILIES].map((f) => {
      const b = h('button', { type: 'button', class: 'btn ws-chip', text: FAMILY_NAMES[f] });
      scope.on(b, 'click', () => { family = f; ui('tap'); render(); });
      chips.append(b);
      return { f, b };
    });
    const grid = h('div', { class: 'ws-grid' });
    const upList = h('div', { class: 'ws-uplist' });
    const empty = h('div', { class: 'sub center ws-empty', text: 'Nothing here yet.', hidden: true });

    function rows() {
      try {
        const m = api.meta;
        const parts = api.allParts();
        return parts.map((d) => ({ id: d.id, name: d.name || d.id, family: d.family || 'special', desc: d.desc || '', tags: d.tags || [], ...(m.partStatus(d.id) || { state: 'locked', count: 0, max: 1, cost: 0, reason: 'Not ready yet.' }) }));
      } catch (e) { log.warn('workshop rows failed'); return []; }
    }
    function wallets() {
      const m = api.meta;
      const get = (fn) => { try { return Number(m[fn]()) || 0; } catch (e) { return 0; } };
      return { gold: get('gold'), shards: get('shards'), core: get('coreDust') };
    }

    function buyPart(id, card) {
      let res;
      try { res = api.meta.buyPart(id); } catch (e) { res = { ok: false, error: 'Could not buy. Try again.' }; }
      if (res && res.ok) { ui('buy'); buzz('collect'); if (card) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); } }
      else { ui('deny'); shake(card || (id && el.querySelector('[data-part="' + id + '"]'))); shell.toast(failText(res), 'error'); }
      refresh();
    }
    function buyUpgrade(id, card) {
      let res;
      try { res = api.meta.upgrades.buy(id); } catch (e) { res = { ok: false, error: 'Could not buy. Try again.' }; }
      if (res && res.ok) { ui('buy'); buzz('collect'); if (card) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); } }
      else { ui('deny'); shake(card); shell.toast(failText(res), 'error'); }
      refresh();
    }
    const denyPart = (id, why, card) => { shake(card || el.querySelector('[data-part="' + id + '"]')); shell.toast(why || 'Not yet.', 'warn'); };
    const denyUp = (id, why, card) => { shake(card); shell.toast(why || 'Not yet.', 'warn'); };

    function openSheet(id) {
      if (sheet) sheet.close();
      sheetId = id;
      const row = rows().find((r) => r.id === id);
      if (!row) return;
      const body = partSheetBody(row, wallets().gold, allCombos(), { buy: (pid) => buyPart(pid, null), deny: (pid, why) => denyPart(pid, why, null) });
      sheet = shell.sheet(row.name, body);
      if (sheet && sheet.el) {
        const prevClose = sheet.close;
        sheet.close = () => { sheetId = null; sheet = null; prevClose(); };
      }
    }

    function refresh() {
      if (!live) return;
      const w = wallets();
      goldPill.setLabel(fmt(w.gold)); shardPill.setLabel(fmt(w.shards)); corePill.setLabel(fmt(w.core));
      if (tab === 'parts') {
        const rs = rows();
        for (const r of rs) {
          let c = cards.get(r.id);
          if (!c) {
            c = partCardEl(r, { open: openSheet, buy: buyPart, deny: denyPart }, scope);
            cards.set(r.id, c);
            grid.append(c.el);
          }
          c.update(r, w.gold);
        }
        if (sheetId && sheet && sheet.el) {
          const row = rs.find((r) => r.id === sheetId);
          if (row) { const nb = partSheetBody(row, w.gold, allCombos(), { buy: (pid) => buyPart(pid, null), deny: (pid, why) => denyPart(pid, why, null) });
            const old = sheet.el.querySelector('.ws-sheet'); if (old) old.replaceWith(nb); }
        }
      } else {
        let list = [];
        try { list = api.meta.upgrades.list() || []; } catch (e) { log.warn('upgrades list failed'); }
        for (const i of list) {
          if (!i || !i.id) continue;
          let c = upCards.get(i.id);
          if (!c) { c = upgradeCardEl(i, { buy: buyUpgrade, deny: denyUp }, scope); upCards.set(i.id, c); upList.append(c.el); }
          c.update(i, w);
        }
        empty.hidden = list.length > 0;
      }
    }

    function render() {
      for (const t of tabBtns) {
        const on = t.id === tab;
        t.b.classList.toggle('on', on);
        t.b.setAttribute('aria-selected', on ? 'true' : 'false');
      }
      chips.hidden = grid.hidden = tab !== 'parts';
      upList.hidden = tab !== 'upgrades';
      for (const c of chipBtns) { const on = c.f === family; c.b.classList.toggle('on', on); c.b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
      refresh();
      for (const [id, c] of cards) { const fam = c.el.getAttribute('data-family'); c.el.hidden = !(family === 'all' || fam === family || (family === 'special' && !FAMILIES.includes(fam))); }
    }

    scope.sub(bus, 'meta:changed', () => { refresh(); });
    scope.add(() => { live = false; if (sheet) { try { sheet.close(); } catch (e) { /* closed */ } } });
    el.append(h('section', { class: 'screen screen-workshop' }, wallet, tabs, chips, grid, upList, empty));
    render();
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
