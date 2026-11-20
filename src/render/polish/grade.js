// Colour grade per biome: a very light soft-light tint over the BACKGROUND only (drawn in drawBack, so gems,
// hazards, the bucket and the HUD keep their true colours). Cross-fades with the biome blend near an edge.
// All colour strings are built once; nothing is allocated per frame. Off on quality 'low'.
import { blendInfo, fin, clamp01 } from './util.js';

// rgb tint and strength (0..1 alpha at full) for each biome. Strengths are small on purpose.
export const GRADE = {
  clay:   { rgb: [255, 190, 120], a: 0.14 },   // warm dusty amber
  quartz: { rgb: [110, 160, 255], a: 0.16 },   // cold blue
  amber:  { rgb: [255, 168, 56],  a: 0.16 },   // honey gold
  magma:  { rgb: [255, 84, 48],   a: 0.15 },   // red heat
  void:   { rgb: [138, 90, 255],  a: 0.16 },   // violet
  abyss:  { rgb: [116, 56, 150],  a: 0.12 },   // worn plum
};
const CSS = {};
for (const id of Object.keys(GRADE)) { const c = GRADE[id].rgb; CSS[id] = `rgb(${c[0]},${c[1]},${c[2]})`; }

// Pure helper (tested): the two alphas to draw, for the current and the next biome.
export function gradeAlphas(biomeId, depth) {
  const cur = GRADE[biomeId] || GRADE.clay, info = blendInfo(biomeId, fin(depth));
  const t = info.to ? clamp01(info.t) : 0, next = info.to ? GRADE[info.to] : null;
  return { cur: cur.a * (1 - t), next: next ? next.a * t : 0, to: info.to && GRADE[info.to] ? info.to : null };
}

export function createGrade() {
  return {
    draw(ctx, state, w, h) {
      const id = GRADE[state.biomeId] ? state.biomeId : 'clay', a = gradeAlphas(id, state.depth);
      ctx.globalCompositeOperation = 'soft-light'; // older WebViews ignore an unknown mode, which just skips the tint
      ctx.globalAlpha = a.cur; ctx.fillStyle = CSS[id]; ctx.fillRect(0, 0, w, h);
      if (a.to && a.next > 0.002) { ctx.globalAlpha = a.next; ctx.fillStyle = CSS[a.to]; ctx.fillRect(0, 0, w, h); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
}
