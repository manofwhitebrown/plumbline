// Rig: the bucket grid, the parts tray, live power, loadouts, Suggest, Clear and Drop.
import { registerScreen, toast, modal, back } from '../shell.js';
import { h, createScope, setText } from '../dom.js';
import { topbar } from '../components/topbar.js';
import { button, deny } from '../components/button.js';
import { progress } from '../components/progress.js';
import { attachTip } from '../components/tooltip.js';
import { popIn } from '../components/celebrate.js';
import { api } from '../api.js';
import { bus, ui, buzz } from '../soft.js';
import { getSettings, setSetting } from '../settings.js';
import * as rs from '../logic/rigState.js';
import { startDrop } from '../flow.js';
import { buildGrid } from './rigGrid.js';
import { buildTray } from './rigTray.js';
import { enableDrag } from './rigDrag.js';
import { openPartSheet } from './rigSheet.js';

let scope = null;

registerScreen('rig', {
  onBack() {
    if (st && st.mode !== 'idle') { st = rs.cancel(); if (repaint) repaint(); return true; }
    return false;
  },
  mount(el) {
    scope = createScope();
    st = rs.initial();
    const rig0 = () => api.rigs.getRig();
    let grid = null, gridKey = '';
    const gridHost = h('div', { class: 'rig-host' });
    const hint = h('p', { class: 'sub center hint', role: 'status' });
    const powerNum = h('span', { class: 'num', text: '0' });
    const powerBar = progress(0, 'Rig power');
    const combos = h('div', { class: 'row wrap combos' });
    const warns = h('div', { class: 'row wrap combos' });

    const tray = buildTray(scope, { onFamily: () => repaint(), onPart: (id, n, used) => run(rs.tapPart(st, id, n, used)) });
    const begin = enableDrag(scope, el, (eff) => applyEffect(eff), (id) => api.partIcon(id, 96));
    scope.on(tray.row, 'pointerdown', (e) => {
      const card = e.target.closest && e.target.closest('.partcard');
      if (card && card.dataset.part) begin(e, { kind: 'tray', partId: card.dataset.part });
    });

    function ensureGrid() {
      const r = rig0();
      const key = r.cols + 'x' + r.rows;
      if (key === gridKey) return;
      gridKey = key;
      grid = buildGrid(r, scope, {
        onRemove: (rr, cc) => { if ((rig0().cells[rr] || [])[cc]) { api.rigs.remove(rr, cc); ui('remove'); repaint(); } },
        onCell: (rr, cc) => run(rs.tapCell(st, rr, cc, (rig0().cells[rr] || [])[cc] || null)),
        onCellDown: (e, rr, cc) => { const id = (rig0().cells[rr] || [])[cc]; if (id) begin(e, { kind: 'cell', r: rr, c: cc, partId: id }); },
      });
      gridHost.textContent = '';
      gridHost.append(grid.el);
    }

    function run(out) {
      st = out.state;
      applyEffect(out.effect);
      repaint();
    }

    function applyEffect(eff) {
      if (!eff || eff.type === 'none') return;
      if (eff.type === 'deny') { deny(tray.row); toast(eff.reason, 'warn'); return; }
      if (eff.type === 'place') {
        const res = api.rigs.place(eff.r, eff.c, eff.partId);
        if (res && res.ok === false) { deny(grid.cells[eff.r] && grid.cells[eff.r][eff.c]); toast(res.error || 'It does not fit there.', 'warn'); }
        else { ui('buy'); buzz('collect'); const cell = grid.cells[eff.r] && grid.cells[eff.r][eff.c]; popIn(cell); }
      } else if (eff.type === 'swap') {
        const res = api.rigs.swap(eff.a, eff.b);
        if (res && res.ok === false) { toast(res.error || 'That move did not work.', 'warn'); ui('deny'); } else ui('tap');
      } else if (eff.type === 'openSheet') {
        openPartSheet(eff.r, eff.c, eff.partId, {
          onMove: (r, c) => { st = rs.startMove(st, r, c); repaint(); },
          onRemove: (r, c) => { api.rigs.remove(r, c); ui('tap'); repaint(); },
        });
      }
      repaint();
    }

    function hintText() {
      if (st.mode === 'part') { const p = api.getPart(st.partId); return 'Tap a glowing square to place ' + (p ? p.name : 'it'); }
      if (st.mode === 'move') return 'Tap a square to move it there';
      return 'Tap a part, then tap a square';
    }

    function preview() {
      let pv = null;
      try { pv = api.rigs.preview(rig0()); } catch (e) { /* show nothing */ }
      pv = pv || {};
      const power = Number.isFinite(pv.power) ? pv.power : 0;
      setText(powerNum, String(Math.round(power)));
      powerBar.set(power / Math.max(1, Number.isFinite(pv.maxPower) ? pv.maxPower : 100));
      combos.textContent = ''; warns.textContent = '';
      for (const c of Array.isArray(pv.combos) ? pv.combos : []) {
        const name = typeof c === 'string' ? c : (c && c.name) || 'Combo';
        const pill = h('button', { type: 'button', class: 'pill combo', text: name });
        if (c && c.desc) attachTip(pill, c.desc, scope);
        combos.append(pill);
      }
      for (const w of Array.isArray(pv.warnings) ? pv.warnings : []) warns.append(h('span', { class: 'pill warn', text: typeof w === 'string' ? w : (w && w.text) || 'Check your rig' }));
    }

    function repaint() {
      ensureGrid();
      const r = rig0();
      grid.paint(r, st.mode === 'part' ? true : st.mode === 'move' ? 'all' : false, st.mode === 'move' ? st.from : null);
      tray.paint(r, st.mode === 'part' ? st.partId : null);
      setText(hint, hintText());
      preview();
      paintLoadouts();
    }
    repaintRef(repaint);

    // Loadouts: tap to load, long press to save and rename.
    const loadRow = h('div', { class: 'row loadouts' });
    const loadBtns = [0, 1, 2].map((i) => {
      const b = h('button', { type: 'button', class: 'chip' });
      let timer = 0, long = false;
      scope.on(b, 'pointerdown', () => { long = false; timer = setTimeout(() => { long = true; buzz('collect'); saveLoadout(i); }, 550); });
      const clear = () => clearTimeout(timer);
      scope.on(b, 'pointerup', clear); scope.on(b, 'pointerleave', clear); scope.on(b, 'pointercancel', clear);
      scope.on(b, 'click', () => {
        if (long) return;
        const res = api.rigs.loadouts.load(i);
        if (res && res.ok === false) { toast(res.error || 'That loadout is empty.', 'warn'); ui('deny'); } else ui('tap');
        repaint();
      });
      loadRow.append(b);
      return b;
    });
    scope.add(() => loadBtns.forEach((b) => b.remove()));
    function paintLoadouts() {
      const names = getSettings().loadoutNames;
      let act = -1;
      try { const a = api.rigs.loadouts.active && api.rigs.loadouts.active(); if (Number.isInteger(a)) act = a; } catch (e) { /* none selected */ }
      loadBtns.forEach((b, i) => { b.classList.toggle('on', i === act); b.setAttribute('aria-pressed', i === act ? 'true' : 'false'); setText(b, names[i]); b.setAttribute('aria-label', names[i] + '. Tap to load, press and hold to save.'); });
    }
    function saveLoadout(i) {
      const input = h('input', { class: 'input', type: 'text', maxlength: 14, value: getSettings().loadoutNames[i], 'aria-label': 'Loadout name' });
      modal({ title: 'Save Loadout', body: h('div', { class: 'stack' }, h('p', { class: 'sub', text: 'Save this Rig in this slot.' }), input), actions: [
        { label: 'Save', kind: 'primary', onPress: () => {
          const res = api.rigs.loadouts.save(i);
          if (res && res.ok === false) { toast(res.error || 'Could not save.', 'error'); return; }
          const names = getSettings().loadoutNames.slice();
          names[i] = input.value || names[i];
          setSetting('loadoutNames', names);
          toast('Loadout saved', 'ok'); repaint();
        } }, { label: 'Cancel' }] });
    }

    const suggest = button({ label: 'Suggest', onPress: () => {
      let next = null;
      try { next = api.suggest && api.suggest.bestRig(api.meta.getMods(), api.meta.ownedParts()); } catch (e) { /* none */ }
      if (!next || !Array.isArray(next.cells)) { toast('No idea yet. Try buying a part.', 'warn'); return; }
      api.rigs.clear();
      next.cells.forEach((row, r) => (row || []).forEach((id, c) => { if (id) api.rigs.place(r, c, id); }));
      toast('Suggested Rig ready', 'ok'); repaint();
    } }, scope);
    const clearBtn = button({ label: 'Clear', onPress: () => { api.rigs.clear(); st = rs.initial(); repaint(); } }, scope);
    const dropBtn = button({ label: 'Drop', kind: 'primary', onPress: () => {
      const has = rig0().cells.some((row) => row.some(Boolean));
      if (!has) { deny(dropBtn); toast('Place a part first.', 'warn'); return; }
      startDrop();
    } }, scope);
    dropBtn.classList.add('grow');
    dropBtn.setAttribute('data-tut', 'rig-drop');

    scope.sub(bus, 'meta:changed', () => repaint());
    scope.sub(bus, 'rig:changed', () => repaint());

    const bar = topbar({}, scope);
    const screen = h('section', { class: 'screen screen-rig' },
      bar,
      gridHost, hint,
      h('div', { class: 'card stack power' },
        h('div', { class: 'row' }, h('span', { class: 'sub', text: 'Rig power' }), h('span', { class: 'grow' }), powerNum),
        powerBar, combos, warns),
      loadRow, tray.el,
      h('div', { class: 'actionbar' }, suggest, clearBtn, dropBtn));
    el.append(screen);
    repaint();
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null; repaint = null; st = null;
  },
});

let st = null;
let repaint = null;
function repaintRef(fn) { repaint = fn; }
