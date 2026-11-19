# GFX-1 notes (art and graphics)

## Done
- Step 1 ART TOOLKIT in `src/render/art/`: `prng.js` (seeded PRNG, text seeds, lattice hash), `noise.js` (value, fbm, ridged, Worley; all tileable with a period), `color.js` (hex/rgb/HSL, mix, lighten/darken toward warm white / ink, ramps), `shapes.js` (rounded polygon, round rect, soft glow, lit gradient, inner shadow, bevel, rim light, contact shadow, facet light from the fixed top-left light), `atlas.js` (shelf packer, `spriteKey(kind,tier,biome,size,frame)`, atlas with named regions, safe without canvas, `destroy()` frees sheets), `registry.js` (list of art for the lab), `swatches.js`.
- `dev/art-lab.html` + `dev/art-lab.js`: grid of every registered art item with quality, zoom, DPR and timing. New generators only need `registerArt({name, group, w, h, paint})`.
- Tests: `tests/render-art-toolkit.test.js` (8 tests: determinism, tiling, ranges, packer overlap, keys, no-canvas atlas).

## In progress
- Nothing half-done.

## Next (in order)
2. Well textures per biome (tileable, 3 depths) built on `noise.js`; reuse `polish/blend.js` for the 15 m blend; hook into `wallTile.js` / `well.js`.
3. Gem models (6 distinct shapes) into the atlas, 6 sizes each, glint strip.
4. Hazard models (bat with 3 flap frames).
5. Bucket and twisted rope (keep `rope.js` API).
6. 26 part icons in `partIcon.js` (keep `draw` and `toDataURL`).
7. Light and atmosphere in `polish/`.
8. Particle sprites and layered effects.
9. Home scene and splash colours.
10. Per-layer cost registration in `quality.js`.

## Measurements
Not yet taken (no browser available in the authoring session). Generation time, memory and fps must be measured in the art lab at DPR 1/2/3 before STATUS: DONE.

STATUS: IN PROGRESS
