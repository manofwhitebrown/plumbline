// Danger vignette: breathes gently; pulses red like a heartbeat when strain > 0.75.
import { makeSprite } from './canvasUtil.js';
import { clamp01 } from './safe.js';

export function createVignette() {
  let dark = null, red = null, phase = 0, strain = 0, reduce = false, level = 0;
  function build(w, h, dpr) {
    const mk = (inner, mid, outer) => makeSprite(64, 96, 1, (g, sw, sh) => {
      const gr = g.createRadialGradient(sw / 2, sh / 2, sh * 0.28, sw / 2, sh / 2, sh * 0.72);
      gr.addColorStop(0, inner); gr.addColorStop(0.6, mid); gr.addColorStop(1, outer);
      g.fillStyle = gr; g.fillRect(0, 0, sw, sh);
    });
    dark = mk('rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.7)');
    red = mk('rgba(255,40,60,0)', 'rgba(255,40,60,0.28)', 'rgba(255,40,60,0.95)');
  }
  return {
    build, // call from resize
    setReduceMotion(v) { reduce = !!v; },
    setStrain(s) { strain = clamp01(+s || 0); },
    heartHz() { return strain > 0.75 ? 1.4 + ((strain - 0.75) / 0.25) * 1.2 : 0; },
    // 0..1 strength of the red pulse right now (exposed for tests)
    redLevel() { return level; },
    update(dtMs) {
      const hz = this.heartHz();
      phase += (dtMs / 1000) * (hz || 0.25);
      const p = phase % 1;
      if (hz > 0) {
        const beat = Math.exp(-Math.pow((p - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((p - 0.3) / 0.08, 2));
        level = (0.25 + 0.75 * Math.min(1, beat)) * ((strain - 0.75) / 0.25 * 0.5 + 0.5);
      } else level = 0;
    },
    draw(ctx, w, h) {
      if (dark) {
        ctx.globalAlpha = (reduce ? 0.5 : 0.75) + (reduce ? 0 : Math.sin(phase * 2.2) * 0.08);
        ctx.drawImage(dark, 0, 0, w, h);
      }
      if (red && level > 0.01) {
        ctx.globalAlpha = level * (reduce ? 0.5 : 1);
        ctx.drawImage(red, 0, 0, w, h);
      }
      ctx.globalAlpha = 1;
    },
  };
}
