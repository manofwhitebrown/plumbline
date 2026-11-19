// A recording fake canvas for the depth tests. Counts canvases and draw calls, accepts any 2D method.
export function makeFake() {
  const stats = { canvases: 0, drawImage: 0, fillRect: 0, calls: 0 };
  function ctxFor(w, h) {
    const target = { canvas: { width: w, height: h } };
    return new Proxy(target, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'drawImage') return () => { stats.drawImage++; };
        if (k === 'fillRect') return () => { stats.fillRect++; };
        if (k === 'createImageData') return (iw, ih) => ({ data: new Uint8ClampedArray(iw * ih * 4), width: iw, height: ih });
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
        return () => { stats.calls++; };
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  }
  const mk = (w, h) => { stats.canvases++; const c = { width: w, height: h }; const g = ctxFor(w, h); c.getContext = () => g; return c; };
  return { mk, stats, ctx: ctxFor(360, 640) };
}
export function laneState(over) {
  const lanes = new Float32Array(5); for (let i = 0; i < 5; i++) lanes[i] = 180 + (i - 2) * 60;
  return Object.assign({ depth: 40, biomeId: 'clay', strain01: 0.2, danger: 0, speed: 1, bucket: { x: 180, y: 240 }, lanes, laneCount: 5, arriveY: 330, w: 360, h: 640, time: 0 }, over || {});
}
