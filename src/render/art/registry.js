// Registry of every generated texture/sprite so the art lab can list them.
// Each entry: { name, group, w, h, paint(ctx, w, h, quality) }.
const entries = [];
export function registerArt(entry) {
  if (entry && entry.name && typeof entry.paint === 'function') entries.push(entry);
}
export function listArt() { return entries.slice(); }
export function clearArt() { entries.length = 0; }
