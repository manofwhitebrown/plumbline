// All icons are small vector strings drawn in code. No images, no emoji.
const wrap = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  gold: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f6c453"/><circle cx="12" cy="12" r="6" fill="none" stroke="#b8862a" stroke-width="1.5"/></svg>`,
  shard: `<svg viewBox="0 0 24 24"><path d="M12 2l6 8-6 12-6-12z" fill="#7fd6ff"/><path d="M12 2l-2 8 2 12 2-12z" fill="#bfeaff"/></svg>`,
  core: `<svg viewBox="0 0 24 24"><path d="M12 2l8 6-3 12H7L4 8z" fill="#b583ff"/><path d="M12 2l-3 6 3 12 3-12z" fill="#d9bfff"/></svg>`,
  settings: wrap('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  home: wrap('<path d="M3 11l9-8 9 8M5 10v10h14V10"/>'),
  rig: wrap('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  crew: wrap('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c3 0 5 1.8 5 5"/>'),
  workshop: wrap('<path d="M14 6l4 4-9 9H5v-4z"/><path d="M13 7l4 4"/>'),
  codex: wrap('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>'),
  more: wrap('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
  pause: wrap('<path d="M8 5v14M16 5v14"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  gift: wrap('<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M12 9v11M3 13h18M12 9c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3"/>'),
  star: wrap('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
  lock: wrap('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  book: wrap('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/>'),
  check: wrap('<path d="M5 12l5 5 9-10"/>'),
  bolt: wrap('<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>'),
};

export function iconHtml(name) {
  return ICONS[name] || ICONS.star;
}
