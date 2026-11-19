import { C, obj, glyph } from './palette.js';

// Controls, states and element icons.
export const UI = {
  back: glyph('<path d="M15 5l-7 7 7 7"/>', '', '<path d="M14 7.4L10.6 11" />'),
  close: glyph('<path d="M6 6l12 12M18 6L6 18"/>', '', ''),
  plus: glyph('<path d="M12 5v14M5 12h14"/>', '', ''),
  minus: glyph('<path d="M5 12h14"/>', '', ''),
  check: glyph('<path d="M5 12.4l4.6 4.8L19 7"/>', '<path d="M5 14l4.6 4.8L19 9.6"/>', ''),
  info: glyph('<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/><circle cx="12" cy="7.8" r=".5"/>', '<circle cx="12" cy="12" r="8.6"/>', ''),
  warning: obj(`<path d="M12 2.6l10 17.4a1 1 0 0 1-.9 1.5H2.9a1 1 0 0 1-.9-1.5z" fill="${C.emberD}"/><path d="M12 4.6l8.4 14.6H3.6z" fill="${C.gold}"/><path d="M12 9.4v5" stroke="${C.woodD}" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="${C.woodD}"/><path d="M12 5.6L7.4 13.6" stroke="#fff6d8" stroke-width="1" stroke-linecap="round" opacity=".7"/>`),
  lock: obj(`<path d="M7.6 11V8a4.4 4.4 0 0 1 8.8 0v3" fill="none" stroke="${C.steelD}" stroke-width="3.2"/><path d="M7.6 11V8a4.4 4.4 0 0 1 8.8 0v3" fill="none" stroke="${C.steel}" stroke-width="1.8"/><rect x="4.6" y="10.6" width="14.8" height="10.6" rx="2.4" fill="${C.goldD}"/><rect x="4.6" y="10.2" width="14.8" height="10" rx="2.4" fill="${C.gold}"/><circle cx="12" cy="14.8" r="1.8" fill="${C.goldD}"/><path d="M12 15.4v2.6" stroke="${C.goldD}" stroke-width="1.8" stroke-linecap="round"/><path d="M6.6 12.4h4" stroke="${C.goldL}" stroke-width="1.2" stroke-linecap="round"/>`),
  unlock: obj(`<path d="M7.6 11V8a4.4 4.4 0 0 1 8.4-1.8" fill="none" stroke="${C.steelD}" stroke-width="3.2" stroke-linecap="round"/><path d="M7.6 11V8a4.4 4.4 0 0 1 8.4-1.8" fill="none" stroke="${C.steel}" stroke-width="1.8" stroke-linecap="round"/><rect x="4.6" y="10.2" width="14.8" height="10" rx="2.4" fill="${C.gold}"/><circle cx="12" cy="14.8" r="1.8" fill="${C.goldD}"/><path d="M12 15.4v2.6" stroke="${C.goldD}" stroke-width="1.8" stroke-linecap="round"/>`),
  fire: obj(`<path d="M12 2.4c.6 3.4 5.6 5.6 5.6 11a5.6 5.6 0 0 1-11.2 0c0-2 .9-3.4 2-4.6.3 1.4 1 2.2 1.8 2.4C9.6 8 10.6 4.8 12 2.4z" fill="${C.emberD}"/><path d="M12 5c.5 2.8 4.4 4.6 4.4 8.8a4.4 4.4 0 0 1-8.8 0c0-1.6.7-2.7 1.6-3.7.3 1 .8 1.6 1.4 1.8.2-2 .5-4.2 1.4-6.9z" fill="${C.ember}"/><path d="M12 12c.4 1.6 2.4 2.4 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1 .6-1.8 1.2-2.4.2.6.5.9.9 1 .1-.9.1-1.8.3-3z" fill="#ffd86a"/>`),
  snowflake: obj(`<path d="M12 2.6v18.8M3.9 7.3l16.2 9.4M3.9 16.7l16.2-9.4" stroke="${C.iceD}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 2.6v18.8M3.9 7.3l16.2 9.4M3.9 16.7l16.2-9.4" stroke="${C.ice}" stroke-width="1.6" stroke-linecap="round"/><path d="M9.6 4.4L12 6.6l2.4-2.2M9.6 19.6L12 17.4l2.4 2.2" fill="none" stroke="${C.ice}" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="12" r="1.8" fill="#fff"/>`),
  bolt: obj(`<path d="M14 1.8L4.6 13.6h6.2l-1.4 8.6 9.6-12.6h-6.4z" fill="${C.goldD}"/><path d="M13.4 3.6L6.6 12.4h5.4l-1 6.2 6.2-8H12z" fill="${C.gold}"/><path d="M12.6 5L8.6 10.4" stroke="${C.goldL}" stroke-width="1.2" stroke-linecap="round"/>`),
  shield: obj(`<path d="M12 2.4l8 2.8v6.2c0 4.8-3.2 8.4-8 10.2-4.8-1.8-8-5.4-8-10.2V5.2z" fill="${C.steelD}"/><path d="M12 4.4l6 2.1v4.8c0 3.7-2.3 6.6-6 8.2-3.7-1.6-6-4.5-6-8.2V6.5z" fill="${C.steel}"/><path d="M12 4.4v15.1c-3.7-1.6-6-4.5-6-8.2V6.5z" fill="#b8c3de"/><path d="M12 8v7M9 11.4h6" stroke="${C.steelD}" stroke-width="1.6" stroke-linecap="round"/><path d="M7.6 7.6v3" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`),
  magnet: obj(`<path d="M5 20V10a7 7 0 0 1 14 0v10h-4.4V10a2.6 2.6 0 0 0-5.2 0v10z" fill="${C.danger}"/><path d="M5 20V10a7 7 0 0 1 3-5.7" fill="none" stroke="#ff98a2" stroke-width="1.2" stroke-linecap="round"/><rect x="5" y="16" width="4.4" height="4.6" fill="${C.steelL}"/><rect x="14.6" y="16" width="4.4" height="4.6" fill="${C.steelL}"/><path d="M5 17.4h4.4M14.6 17.4H19" stroke="${C.steel}" stroke-width="1"/>`),
  sound: glyph('<path d="M4 9.6h3.6L12 6v12l-4.4-3.6H4z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M17.8 6.8a7.4 7.4 0 0 1 0 10.4"/>', '<path d="M4 9.6h3.6L12 6v12l-4.4-3.6H4z"/>', '<path d="M5.6 11.2h1.4"/>'),
  music: glyph('<path d="M9 17.6V5.4l10-2v12.2"/><circle cx="6.6" cy="17.6" r="2.6"/><circle cx="16.6" cy="15.6" r="2.6"/>', '<circle cx="6.6" cy="17.6" r="2.6"/><circle cx="16.6" cy="15.6" r="2.6"/>', ''),
  haptics: glyph('<rect x="8" y="3.6" width="8" height="16.8" rx="2.2"/><path d="M4.2 8.4v7.2M19.8 8.4v7.2M1.8 10.4v3.2M22.2 10.4v3.2"/>', '<rect x="8" y="3.6" width="8" height="16.8" rx="2.2"/>', '<path d="M9.8 6v3"/>'),
  motion: glyph('<circle cx="12" cy="12" r="3"/><path d="M12 3.6c-2.6 2-2.6 4.4 0 6.4M12 20.4c2.6-2 2.6-4.4 0-6.4M3.6 12c2-2.6 4.4-2.6 6.4 0M20.4 12c-2 2.6-4.4 2.6-6.4 0"/>', '<circle cx="12" cy="12" r="3"/>', ''),
  textsize: glyph('<path d="M3.4 19L8 6l4.6 13M5 14.4h6M14 19l3-8 3 8M15 16.6h4"/>', '<path d="M3.4 19L8 6l4.6 13z"/>', ''),
  eye: glyph('<path d="M2.4 12S6 5.6 12 5.6 21.6 12 21.6 12 18 18.4 12 18.4 2.4 12 2.4 12z"/><circle cx="12" cy="12" r="3.2"/>', '<circle cx="12" cy="12" r="3.2"/>', '<path d="M5.6 11.6a7.6 5 0 0 1 3-2.4"/>'),
  save: glyph('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>', '<path d="M5 4h11l3 3v13H5z"/>', '<path d="M6.6 5.6v2"/>'),
  export: glyph('<path d="M12 15V3.6M7.6 8L12 3.6 16.4 8M5 13v6.4h14V13"/>', '<path d="M5 13v6.4h14V13z"/>', ''),
  import: glyph('<path d="M12 3.6V15M7.6 10.8L12 15.2l4.4-4.4M5 13v6.4h14V13"/>', '<path d="M5 13v6.4h14V13z"/>', ''),
};
