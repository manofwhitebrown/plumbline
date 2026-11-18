// Suggest a good rig. First version returns an empty, valid rig of the right size.

function pickSize(value, allowed, fallback) {
  return allowed.indexOf(value) !== -1 ? value : fallback;
}

export function emptyRig(cols, rows) {
  const c = pickSize(cols, [4, 5], 4);
  const r = pickSize(rows, [3, 4], 3);
  const cells = [];
  for (let i = 0; i < r; i++) cells.push(new Array(c).fill(null));
  return { cols: c, rows: r, cells };
}

export const suggest = {
  bestRig(mods, ownedParts) {
    void ownedParts;
    const m = mods && typeof mods === 'object' ? mods : {};
    return emptyRig(m.cols, m.rows);
  },
};

export default suggest;
