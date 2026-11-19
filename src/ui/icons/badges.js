import { C, obj, glyph, illo } from './palette.js';

// One tiny badge per part family (collector, processor, defense, engine, special).
const disc = (fill, dark, inner) => obj(`<circle cx="12" cy="12" r="10.4" fill="${dark}"/><circle cx="12" cy="11.6" r="9.6" fill="${fill}"/><circle cx="12" cy="11.6" r="8" fill="none" stroke="${dark}" stroke-width=".8" opacity=".6"/>${inner}<path d="M5.6 8.4A7.4 7.4 0 0 1 10 4.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".5"/>`);

export const BADGES = {
  'badge-collector': disc('#6f94ff', '#27418f', `<path d="M12 6.4v7.4a2.6 2.6 0 0 1-5 .8" fill="none" stroke="#eef2ff" stroke-width="2" stroke-linecap="round"/>`),
  'badge-processor': disc('#ffb454', '#9a5a14', `<circle cx="12" cy="11.6" r="2.2" fill="#fff3da"/><path d="M12 5.6v2M12 15.6v2M6 11.6h2M16 11.6h2M7.8 7.4l1.4 1.4M14.8 14.4l1.4 1.4M7.8 15.8l1.4-1.4M14.8 8.8l1.4-1.4" stroke="#fff3da" stroke-width="1.8" stroke-linecap="round"/>`),
  'badge-defense': disc('#46e3a3', '#17805a', `<path d="M12 6l4.6 1.6v3.6c0 2.7-1.9 4.6-4.6 5.6-2.7-1-4.6-2.9-4.6-5.6V7.6z" fill="#e3fff3"/><path d="M12 6v10.8c-2.7-1-4.6-2.9-4.6-5.6V7.6z" fill="#a8f2d3"/>`),
  'badge-engine': disc('#ff7a45', '#a8381a', `<path d="M13.4 5.4l-4.6 6.4h3l-.8 5.2 4.6-6.6h-3z" fill="#fff0d8"/>`),
  'badge-special': disc('#b583ff', '#5b34a0', `<path d="M12 5.8l1.7 4 4.1.4-3.1 2.8.9 4.1-3.6-2.1-3.6 2.1.9-4.1-3.1-2.8 4.1-.4z" fill="#f4eaff"/>`),
};

// Crew icons (same ids as the ones crewCard.js draws today, so they can be swapped in later).
export const CREW = {
  winch: glyph('<circle cx="12" cy="10" r="5"/><path d="M12 15v6M7 21h10M12 5V3"/>', '<circle cx="12" cy="10" r="5"/>', '<path d="M9 8a3.2 3.2 0 0 1 2-1.4"/>'),
  smithy: glyph('<path d="M3 9h14a4 4 0 0 0 4-4H8L3 9zM9 9v6M6 20h12M9 15h6l1 5"/>', '<path d="M3 9h14a4 4 0 0 0 4-4H8z"/>', ''),
  cart: glyph('<path d="M3 7h13l-2 8H6zM16 9h5"/><circle cx="8" cy="19" r="1.6"/><circle cx="14" cy="19" r="1.6"/>', '<path d="M3 7h13l-2 8H6z"/>', ''),
  lamp: glyph('<path d="M9 21h6M10 17h4M8 13a5 5 0 1 1 8 0c0 2-1 3-1 4H9c0-1-1-2-1-4z"/>', '<path d="M8 13a5 5 0 1 1 8 0c0 2-1 3-1 4H9c0-1-1-2-1-4z"/>', '<path d="M9.6 9a3 3 0 0 1 1.6-1.4"/>'),
  assay: glyph('<path d="M12 3v18M5 7h14M5 7l-2 6a3 3 0 0 0 6 0zM19 7l-2 6a3 3 0 0 0 6 0z"/>', '<path d="M5 7l-2 6a3 3 0 0 0 6 0zM19 7l-2 6a3 3 0 0 0 6 0z"/>', ''),
  foundry: glyph('<path d="M5 21V10l4 3V9l4 3V8l6 3v10zM9 21v-4h4v4"/>', '<path d="M5 21V10l4 3V9l4 3V8l6 3v10z"/>', ''),
};

// Small illustrations for empty, locked and error states (64x64).
export const ILLO = {
  'illo-empty': illo(`<ellipse cx="32" cy="50" rx="22" ry="6" fill="#0d1220"/><path d="M14 24h36l-4 24a4 4 0 0 1-4 3H22a4 4 0 0 1-4-3z" fill="${C.woodD}"/><path d="M16 24h32l-3.6 22.4a2.4 2.4 0 0 1-2.4 2H22a2.4 2.4 0 0 1-2.4-2z" fill="${C.wood}"/><ellipse cx="32" cy="24" rx="18" ry="4" fill="#1a1006"/><path d="M14.6 32h34.8M17 41h30" stroke="${C.steelD}" stroke-width="3"/><path d="M14 22c3-12 33-12 36 0" fill="none" stroke="${C.steel}" stroke-width="2.4" stroke-linecap="round"/><path d="M22 28v16" stroke="${C.woodL}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`),
  'illo-locked': illo(`<ellipse cx="32" cy="54" rx="20" ry="5" fill="#0d1220"/><path d="M20 28V20a12 12 0 0 1 24 0v8" fill="none" stroke="${C.steelD}" stroke-width="7"/><path d="M20 28V20a12 12 0 0 1 24 0v8" fill="none" stroke="${C.steel}" stroke-width="4"/><rect x="12" y="27" width="40" height="27" rx="6" fill="${C.goldD}"/><rect x="12" y="25.4" width="40" height="26.6" rx="6" fill="${C.gold}"/><rect x="12" y="25.4" width="40" height="6" rx="6" fill="${C.goldL}" opacity=".5"/><circle cx="32" cy="39" r="4.6" fill="${C.goldD}"/><path d="M32 41v7" stroke="${C.goldD}" stroke-width="4.4" stroke-linecap="round"/><circle cx="18" cy="31" r="1.4" fill="${C.goldD}"/><circle cx="46" cy="31" r="1.4" fill="${C.goldD}"/><circle cx="18" cy="47" r="1.4" fill="${C.goldD}"/><circle cx="46" cy="47" r="1.4" fill="${C.goldD}"/>`),
  'illo-error': illo(`<ellipse cx="32" cy="54" rx="22" ry="5" fill="#0d1220"/><path d="M32 7l27 46a2.6 2.6 0 0 1-2.3 4H7.3A2.6 2.6 0 0 1 5 53z" fill="${C.emberD}"/><path d="M32 13l22 38H10z" fill="${C.gold}"/><path d="M32 13l22 38H32z" fill="#e0a93a"/><path d="M32 26v14" stroke="${C.woodD}" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="46" r="3" fill="${C.woodD}"/><path d="M24 24L14 41" stroke="#fff6d8" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`),
};
