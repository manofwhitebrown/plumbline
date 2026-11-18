// Helpers for the text limit tests (NEW-8). Limits come from docs/manager/LAYOUT_CHECK.md section 3.
import assert from 'node:assert/strict';

export const LIMITS = {
  partName: 14,
  partDesc: 90,
  comboName: 20,
  comboDesc: 90,
  biomeName: 12,
  goalText: 28,
  listName: 22, // crew, upgrade, achievement, quest
  listDesc: 80,
  toast: 60,
  fmt: 8,
};

// Check a list of [where, text] pairs. Fails with ONE message that names every bad item.
export function checkLimit(label, pairs, max) {
  const bad = [];
  for (const [where, text] of pairs) {
    if (typeof text !== 'string' || text.length === 0) { bad.push(`${where}: ${label} is empty or not text`); continue; }
    if (text !== text.trim() || /[\n\r\t]/.test(text)) bad.push(`${where}: ${label} has stray spaces or line breaks`);
    if (text.length > max) bad.push(`${where}: ${label} is ${text.length} characters (max ${max}): "${text}"`);
  }
  assert.deepEqual(bad, [], `${label} too long. Shorten the text in src/data.`);
}
