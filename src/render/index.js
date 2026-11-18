// Renderer entry (STUB: real drawing comes next). Signatures follow CONTRACT section 9.
export function createRenderer(canvas, opts = {}) {
  let w = 360, h = 640, dead = false;
  return {
    resize(nw, nh, dpr) { w = Number(nw) || w; h = Number(nh) || h; },
    setRun(runView, rig) {},
    pushEvents(events) {},
    frame(dtMs, alpha) {},
    setQuality(q) {},
    safeRect() { return { top: 88, bottom: Math.max(88, h - 120) }; },
    destroy() { dead = true; },
  };
}
