// cinematics/biomeCard.js: a stylised title card at the edge of a biome: name in the display font, a light sweep and a short
// subtitle. 1400 ms. Text only (no panel), low alpha, pointer-events none, placed just under the HUD top zone. DOM, transform and opacity only.
import { ease, seg } from './common.js';

export const BIOME_CARD_MS = 1400;
export const SUBTITLES = {
  clay: 'The Warm Dark', quartz: 'The Cold Clear Hall', amber: 'The Amber Veins',
  magma: 'The Ember Throat', void: 'The Quiet Beyond', abyss: 'The Endless Dark',
};
const GLOW = { clay: '#ffd9a0', quartz: '#a9c4ff', amber: '#ffc56b', magma: '#ff8a55', void: '#b583ff', abyss: '#d06bff' };

export function makeBiomeCard(host, opts) {
  const o = opts || {};
  const doc = o.doc || (typeof document !== 'undefined' ? document : null);
  const id = o.id || 'clay';
  const name = String(o.name || id).toUpperCase();
  const sub = o.subtitle || SUBTITLES[id] || '';
  let els = null;
  if (doc && host && host.appendChild) {
    const wrap = doc.createElement('div');
    wrap.setAttribute('aria-hidden', 'true'); wrap.className = 'cine-biome';
    wrap.style.cssText = 'position:absolute;left:0;right:0;top:96px;text-align:center;pointer-events:none;z-index:41;opacity:0;will-change:opacity,transform';
    const box = doc.createElement('div'); box.style.cssText = 'position:relative;display:inline-block;overflow:hidden;padding:2px 18px';
    const title = doc.createElement('div'); title.textContent = name;
    title.style.cssText = 'font:700 26px/1.1 var(--font-display, inherit);letter-spacing:.24em;text-indent:.24em;color:' + (GLOW[id] || '#ffe3a1') + ';text-shadow:0 0 18px rgba(0,0,0,.6),0 2px 10px rgba(0,0,0,.5);will-change:transform';
    const sweep = doc.createElement('div');
    sweep.style.cssText = 'position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,rgba(255,227,161,0),rgba(255,227,161,.55),rgba(255,227,161,0));mix-blend-mode:screen;opacity:0;will-change:transform,opacity';
    box.append(title, sweep);
    const subEl = doc.createElement('div'); subEl.textContent = sub;
    subEl.style.cssText = 'font:500 12px/1.3 var(--font-body, inherit);letter-spacing:.16em;text-transform:uppercase;color:#c9d2ef;opacity:0;margin-top:4px;text-shadow:0 1px 8px rgba(0,0,0,.7);will-change:opacity,transform';
    wrap.append(box, subEl); host.appendChild(wrap);
    els = { wrap, title, sweep, subEl };
  }
  return {
    id: 'biome:' + id, durationMs: BIOME_CARD_MS,
    update(t, p) {
      if (!els) return;
      const inA = seg(t, 0, 260), outA = 1 - seg(t, 1100, 300, ease.in);
      els.wrap.style.opacity = String(Math.min(inA, outA) * 0.92);
      els.title.style.transform = 'translate3d(0,' + (8 * (1 - ease.out(Math.min(1, t / 320)))).toFixed(2) + 'px,0)';
      const sw = seg(t, 260, 700, ease.inOut);
      els.sweep.style.opacity = String(Math.sin(sw * Math.PI));
      els.sweep.style.transform = 'translate3d(' + (-120 + sw * 320).toFixed(1) + '%,0,0)';
      const sa = seg(t, 380, 260);
      els.subEl.style.opacity = String(sa);
      els.subEl.style.transform = 'translate3d(0,' + (6 * (1 - sa)).toFixed(2) + 'px,0)';
    },
    finish() { if (els && els.wrap.remove) els.wrap.remove(); els = null; },
  };
}
