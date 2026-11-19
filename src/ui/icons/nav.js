import { C, obj, glyph } from './palette.js';

// Tab bar and screen icons. Glyphs take their colour from the text colour.
export const NAV = {
  home: glyph('<path d="M4 20V11M20 20V11M3 11l9-6 9 6M4 20h16M9 9.6V5M15 9.6V5"/><path d="M9 20v-4a3 3 0 0 1 6 0v4"/>', '<path d="M4 11l8-5.4L20 11v9H4z"/>', '<path d="M5.4 11.6L11 8"/>'),
  rig: glyph('<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>', '<rect x="13" y="13" width="7" height="7" rx="1.8"/><rect x="4" y="4" width="7" height="7" rx="1.8"/>', '<path d="M5.6 6.4v2M14.6 15.4v2"/>'),
  workshop: glyph('<path d="M3 8h13a4 4 0 0 0 4-3H8.5L3 8z"/><path d="M8 8v4h6l1.4 5H9.6M7 20h11"/>', '<path d="M3 8h13a4 4 0 0 0 4-3H8.5z"/>', '<path d="M5.6 7.2h6"/>'),
  crew: glyph('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.8 2.8-6 6.2-6s6.2 2.2 6.2 6"/><circle cx="17.4" cy="9" r="2.4"/><path d="M17 14.2c2.8 0 4.6 1.6 4.6 4.8"/>', '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c0-3.8 2.8-6 6.2-6s6.2 2.2 6.2 6z"/>', '<path d="M7.6 6.6a2 2 0 0 1 1.6-.8"/>'),
  codex: glyph('<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>', '<path d="M5 4.5h11a3 3 0 0 1 3 3V14H8a3 3 0 0 0-3 3z"/>', '<path d="M6.6 6.6v6"/>'),
  more: glyph('<rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="8" cy="12" r=".6"/><circle cx="12" cy="12" r=".6"/><circle cx="16" cy="12" r=".6"/>', '<rect x="3" y="8" width="18" height="8" rx="4"/>', ''),
  rewards: obj(`<path d="M3 11a9 7 0 0 1 18 0v1H3z" fill="${C.woodL}"/><path d="M3 11a9 7 0 0 1 18 0" fill="none" stroke="${C.woodD}" stroke-width="1.2"/><rect x="3" y="12" width="18" height="8.6" rx="1.6" fill="${C.wood}"/><rect x="3" y="12" width="18" height="2" fill="${C.woodD}"/><path d="M8 5.2v15.4M16 5.2v15.4" stroke="${C.steelD}" stroke-width="2"/><rect x="10" y="10.6" width="4" height="5" rx="1" fill="${C.gold}"/><circle cx="12" cy="12.6" r=".9" fill="${C.goldD}"/><path d="M5 9.4A9 5 0 0 1 9 6.4" stroke="#fff6dc" stroke-width="1" stroke-linecap="round" opacity=".6" fill="none"/>`),
  settings: glyph('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/><circle cx="12" cy="12" r="6.8"/>', '<circle cx="12" cy="12" r="6.8"/>', '<path d="M8 8.4a5.6 5.6 0 0 1 2-1.4"/>'),
  pause: glyph('<path d="M8.5 5v14M15.5 5v14"/>', '<rect x="6" y="4" width="5" height="16" rx="1.6"/><rect x="13" y="4" width="5" height="16" rx="1.6"/>', ''),
  play: glyph('<path d="M8 5l11 7-11 7z"/>', '<path d="M8 5l11 7-11 7z"/>', '<path d="M9.6 8l3.4 2.3"/>'),
  gift: glyph('<rect x="3.4" y="9" width="17.2" height="11" rx="2"/><path d="M12 9v11M3.4 13.4h17.2"/><path d="M12 9C9 9 7 8 7 6.2S9.6 4.6 12 9c2.4-4.4 5-2.8 5-.8S15 9 12 9z"/>', '<rect x="3.4" y="9" width="17.2" height="11" rx="2"/>', '<path d="M5.4 11v1.4"/>'),
  star: glyph('<path d="M12 3.4l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 17l-5.3 2.9 1.1-6L3.4 9.7l6-.8z"/>', '<path d="M12 3.4l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 17l-5.3 2.9 1.1-6L3.4 9.7l6-.8z"/>', '<path d="M10.2 8.6L12 5.4"/>'),
  trophy: obj(`<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="${C.gold}"/><path d="M7 3h10v1.6H7z" fill="${C.goldL}"/><path d="M7 4.6H4v1.6a3.6 3.6 0 0 0 3.4 3.6M17 4.6h3v1.6a3.6 3.6 0 0 1-3.4 3.6" fill="none" stroke="${C.goldD}" stroke-width="1.6"/><path d="M12 14v4M8 21h8l-1-3H9z" fill="${C.goldD}"/><path d="M9.2 5.6v3.4" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`),
  quest: glyph('<path d="M6 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9.6 8.4h5.6M9.6 12h5.6M9.6 15.6h3"/>', '<path d="M6 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>', '<path d="M7.6 5.4v12"/>'),
  clock: glyph('<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.4l3.4 2"/>', '<circle cx="12" cy="12" r="8.6"/>', '<path d="M7 8.6a6 6 0 0 1 2-2"/>'),
  chevron: glyph('<path d="M9 5l7 7-7 7"/>', '', ''),
};
