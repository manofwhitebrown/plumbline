// Guide: a short, friendly "how to play". Every number comes from the data files (guideData.js).
import { registerScreen, back, go } from '../shell.js';
import { h, svg, createScope } from '../dom.js';
import { iconHtml } from '../icons.js';
import { button } from '../components/button.js';
import { api } from '../api.js';
import { guideSections, familyShowcase } from './guideData.js';
import '../styles/guide.css';

let scope = null;

function partTile(p) {
  const url = api.partIcon(p.id, 96);
  const pic = url ? h('img', { class: 'gd-icon', src: url, alt: '', width: 48, height: 48, draggable: 'false' })
    : h('span', { class: 'gd-icon gd-fallback' }, svg(iconHtml('rig')));
  return h('li', { class: 'gd-part' }, pic, h('span', { class: 'gd-pname', text: p.name }));
}

function families() {
  const wrap = h('div', { class: 'gd-families' });
  for (const f of familyShowcase()) {
    wrap.append(h('div', { class: 'gd-family' },
      h('p', { class: 'gd-ftitle', text: f.title }),
      h('p', { class: 'sub', text: f.line }),
      h('ul', { class: 'gd-parts' }, ...f.sample.map(partTile))));
  }
  return wrap;
}

function collapseInfo() {
  try {
    const pv = api.meta.collapse.preview();
    return pv && typeof pv === 'object' ? { resets: pv.resets, keeps: pv.keeps } : null;
  } catch (e) { return null; }
}

function sizes() {
  try {
    const m = api.meta.getMods();
    return { cols: m && m.cols, rows: m && m.rows };
  } catch (e) { return null; }
}

registerScreen('guide', {
  mount(el) {
    scope = createScope();
    const goBack = () => { if (!back()) go('home'); };
    const backBtn = h('button', { class: 'btn ghost iconbtn', type: 'button', 'aria-label': 'Back' }, svg(iconHtml('back')));
    scope.on(backBtn, 'click', goBack);
    const body = h('div', { class: 'gd-body' });
    let sections = [];
    try { sections = guideSections(sizes(), collapseInfo()); } catch (e) { sections = []; }
    sections.forEach((s, i) => {
      const card = h('section', { class: 'card gd-card', 'aria-labelledby': 'gd-' + s.id },
        h('div', { class: 'gd-card-head' },
          h('div', { class: 'gd-step num', 'aria-hidden': 'true', text: String(i + 1) }),
          h('h2', { class: 'title', id: 'gd-' + s.id, text: s.title })),
        ...s.lines.map((t) => h('p', { class: 'gd-line', text: t })));
      if (s.families) card.append(families());
      body.append(card);
    });
    if (!sections.length) body.append(h('p', { class: 'sub', text: 'The guide is not ready. Try again soon.' }));
    body.append(h('div', { class: 'gd-go' }, button({ label: 'Open Rig', kind: 'primary', onPress: () => go('rig') }, scope)));
    el.append(h('section', { class: 'screen screen-guide no-pad' },
      h('div', { class: 'gd-top' }, backBtn, h('h1', { class: 'gd-title', text: 'How to play' })), body));
  },
  unmount() {
    if (scope) scope.dispose();
    scope = null;
  },
});
