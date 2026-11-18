# POLISH SPLIT — who touches the look and feel (Manager decision)

AI-2 finished the engine. It now owns the **polish layer**: extra visuals and smoothness that sit on top of the finished parts. This note stops anyone from clashing.

## Ownership

| Who | Owns |
|---|---|
| AI-2 | `src/render/polish/` (new folder, all files), `src/feel/` (new folder, pure logic), `src/ui/styles/polish.css` (new, loaded last), `docs/design/ART_DIRECTION.md`, tests `tests/polish-*.test.js` and `tests/feel-*.test.js` |
| NEW-7 | everything else in `src/render/` and `dev/` (core renderer, rope, bucket, items, effects, lab, device wall) |
| NEW-1 to NEW-4 | their screens and their own CSS files |
| NEW-8 | layout fixes in `src/ui/styles/fixes/` |

## The only connection points

1. **Renderer hook.** `src/render/polish/index.js` exports `createPolish({ reduceMotion, quality })` returning `{ resize(w, h, dpr), update(dtMs, state), drawBack(ctx, state), drawFront(ctx, state), setQuality(q), destroy() }`. `state` = `{ depth, biomeId, strain01, danger, speed, bucket:{x,y}, lanes, w, h, time }`. The renderer calls `drawBack` after the well walls and before items, and `drawFront` after items and before the vignette. AI-2 may make this one small edit (a few lines) in `src/render/index.js` and must say so in its notes. NEW-7 must keep the calls when it edits that file.
2. **Smoothing helpers.** `src/feel/spring.js` and `src/feel/cues.js` are pure functions. Anyone may import them (HUD numbers, strain gauge, camera).
3. **CSS.** `polish.css` changes only looks (shadows, gradients, glows, transitions, press states). It never changes sizes, margins or positions, so it cannot break the layout check.

## Rules for the polish layer

- Quality `low` or Reduce motion: layers switch off or soften. 60 fps on a mid phone, no per-frame allocations, particles capped (polish total 120).
- Nothing may hide items, hazards or the HUD zones. Contrast of gameplay objects always wins.
- All drawn in code. No images.
