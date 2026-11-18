// Part icons (STUB: neutral plate for now). x, y = top-left of the square.
export function draw(ctx, partId, x, y, size, state) {
  try {
    if (!ctx) return;
    ctx.fillStyle = '#1d2740';
    ctx.fillRect(x, y, size, size);
  } catch (e) { /* never throw */ }
}
export function toDataURL(partId, size) { return ''; }
export default { draw, toDataURL };
