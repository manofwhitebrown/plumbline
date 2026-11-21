// Small flat pictures for the 36 relics, one path each on a 24 x 24 grid. [HOOK-3]
// Drawn in code. A relic that is not found yet is drawn as a dark silhouette of the same shape.
export const SHAPES = Object.freeze({
  bowl: 'M3 10h18c0 5-4 9-9 9s-9-4-9-9z',
  whistle: 'M3 8h11l4 4-4 4H3z',
  thumb: 'M8 21V8a4 4 0 0 1 8 0v13z',
  coin: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 7v10M9 12h6',
  idol: 'M8 3h8l2 6-2 4v8H8v-8l-2-4z',
  mask: 'M3 6c6-3 12-3 18 0v6c0 5-4 9-9 9s-9-4-9-9z',
  shard: 'M12 2l6 8-3 12H9L6 10z',
  lens: 'M12 3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z',
  comb: 'M3 8h18v4H3zM5 12v8h2v-8zM10 12v8h2v-8zM15 12v8h2v-8z',
  bell: 'M12 3a6 6 0 0 1 6 6v6l3 3H3l3-3V9a6 6 0 0 1 6-6zM10 20a2 2 0 0 0 4 0z',
  compass: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  crown: 'M3 18l2-11 5 5 2-7 2 7 5-5 2 11z',
  bee: 'M12 7c3 0 6 2.5 6 6s-3 6-6 6-6-2.5-6-6 3-6 6-6zM8 7L5 3l5 2zM16 7l3-4-5 2z',
  knot: 'M4 8c4-6 12 2 16-3v4c-4 5-12-3-16 3zM4 16c4-6 12 2 16-3v4c-4 5-12-3-16 3z',
  fern: 'M12 2c5 4 7 10 0 20C5 12 7 6 12 2z',
  eye: 'M2 12c4-6 16-6 20 0-4 6-16 6-20 0z',
  spindle: 'M12 2l4 10-4 10-4-10z',
  nail: 'M8 3h8v3h-3l-1 16-1-16H8z',
  ring: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z',
  locket: 'M12 2a4 4 0 0 1 4 4v1a7 7 0 1 1-8 0V6a4 4 0 0 1 4-4z',
  tongs: 'M7 2l5 12 5-12h2l-6 14v6h-2v-6L5 2z',
  blade: 'M12 2c4 6 4 12 2 16h-4c-2-4-2-10 2-16zM9 19h6v3H9z',
  tooth: 'M5 4h14c1 6-1 9-3 11l-1 7h-2l-1-6-1 6H9l-1-7c-2-2-4-5-3-11z',
  thread: 'M5 3h14v3H5zM7 6h10v12H7zM5 18h14v3H5z',
  seed: 'M6 18C4 10 10 4 20 4c0 10-6 16-14 14z',
  map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z',
  pin: 'M12 2a6 6 0 0 1 6 6c0 5-6 12-6 12S6 13 6 8a6 6 0 0 1 6-6z',
  pearl: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16z',
  anchor: 'M11 2h2v4h4v2h-4v10c4 0 6-3 6-6h-2l3-3 3 3h-2c0 6-4 10-9 10s-9-4-9-10H1l3-3 3 3H5c0 3 2 6 6 6V8H7V6h4z',
  rib: 'M5 3c10 0 14 6 14 18-8 0-14-5-14-18z',
  heart: 'M12 21C3 14 2 8 6 5c3-2 5 0 6 2 1-2 3-4 6-2 4 3 3 9-6 16z',
});

// Returns an <svg> markup string. color is a #rrggbb; hidden draws the dark silhouette.
export function relicSvg(shape, color, hidden, size) {
  const d = SHAPES[shape] || SHAPES.pearl;
  const px = Number(size) > 0 ? Number(size) : 40;
  const fill = hidden ? '#1c2236' : /^#[0-9a-f]{6}$/i.test(color) ? color : '#9fb4ff';
  return '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" aria-hidden="true" focusable="false">' +
    '<path d="' + d + '" fill="' + fill + '" fill-rule="evenodd" stroke="' + (hidden ? '#2a3555' : 'rgba(255,255,255,.55)') + '" stroke-width="0.8" stroke-linejoin="round"/></svg>';
}
