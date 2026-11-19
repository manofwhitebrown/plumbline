// Shared colours and wrappers for the PLUMBLINE icon set (UIART-1).
// Every icon is a 24x24 SVG string: a dark tone, a main tone and a small highlight.
// "Object" icons use fixed colours. "Glyph" icons use currentColor so tab bars, buttons
// and states can tint them with plain CSS.
export const C = {
  gold: '#f6c453', goldD: '#a8741f', goldL: '#fff0c4',
  shard: '#7fd6ff', shardD: '#2a7fb0', shardL: '#e0f6ff',
  core: '#b583ff', coreD: '#5b34a0', coreL: '#efe2ff',
  steel: '#9aa6c4', steelD: '#434d6b', steelL: '#eef2ff',
  wood: '#b0703c', woodD: '#5a3419', woodL: '#e8b27a',
  ember: '#ff7a45', emberD: '#a8381a', emberL: '#ffd0aa',
  ok: '#46e3a3', okD: '#17805a', okL: '#c9ffe9',
  danger: '#ff4d5e', dangerD: '#8f1626', dangerL: '#ffc2c8',
  ice: '#b9ecff', iceD: '#4f9ac0',
};

const NS = 'xmlns="http://www.w3.org/2000/svg"';

// Coloured object icon.
export const obj = (inner) => `<svg viewBox="0 0 24 24" ${NS} focusable="false">${inner}</svg>`;

// Glyph icon: soft shadow tone + main stroke + tiny highlight, all from currentColor.
export const glyph = (main, shade = '', hi = '') =>
  `<svg viewBox="0 0 24 24" ${NS} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false">` +
  (shade ? `<g stroke-width="0" fill="currentColor" opacity=".28">${shade}</g>` : '') +
  `<g>${main}</g>` + (hi ? `<g stroke="#fff" stroke-width="1.1" opacity=".55">${hi}</g>` : '') + '</svg>';

// Larger two-tone illustration (empty, locked and error states), 64x64.
export const illo = (inner) => `<svg viewBox="0 0 64 64" ${NS} focusable="false">${inner}</svg>`;
