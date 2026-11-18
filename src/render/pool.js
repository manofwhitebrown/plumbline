// A fixed-size pool. It never grows. When full, it reuses the oldest slot.
export function createPool(size, make) {
  const items = new Array(size);
  for (let i = 0; i < size; i++) { items[i] = make(); items[i].alive = false; }
  let next = 0;
  let live = 0;
  const stats = { acquired: 0, recycled: 0, size };
  return {
    items, stats,
    get live() { return live; },
    acquire() {
      stats.acquired++;
      for (let k = 0; k < size; k++) {
        const o = items[(next + k) % size];
        if (!o.alive) { next = (next + k + 1) % size; o.alive = true; live++; return o; }
      }
      // full: reuse the oldest slot
      const o = items[next]; next = (next + 1) % size; stats.recycled++;
      return o;
    },
    release(o) { if (o && o.alive) { o.alive = false; live--; } },
    clear() { for (let i = 0; i < size; i++) items[i].alive = false; live = 0; next = 0; },
  };
}
