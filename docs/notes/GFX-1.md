# GFX-1 notes (art and graphics)

## Done
- Step 1 ART TOOLKIT in `src/render/art/`: `prng.js` (seeded PRNG, text seeds, lattice hash), `noise.js` (value, fbm, ridged, Worley; all tileable with a period), `color.js` (hex/rgb/HSL, mix, lighten/darken toward warm white / ink, ramps), `shapes.js` (rounded polygon, round rect, soft glow, lit gradient, inner shadow, bevel, rim light, contact shadow, facet light from the fixed top-left light), `atlas.js` (shelf packer, `spriteKey(kind,tier,biome,size,frame)`, atlas with named regions, safe without canvas, `destroy()` frees sheets), `registry.js` (list of art for the lab), `swatches.js`.
- `dev/art-lab.html` + `dev/art-lab.js`: grid of every registered art item with quality, zoom, DPR and timing. New generators only need `registerArt({name, group, w, h, paint})`.
- Tests: `tests/render-art-toolkit.test.js` (8 tests: determinism, tiling, ranges, packer overlap, keys, no-canvas atlas).

- Step 2 WELL TEXTURES (`src/render/art/wall*.js`): `wallBase.js` (stone body: height map from fbm/Worley/ridged with domain warp, lit from top-left, crack ambient occlusion, glowing seams, far layer duller and darker with side falloff), `wallShapes.js` (cracks, crystals, resin pockets, honey drips, stars; all wrap top to bottom), `wallBiomes.js` (clay bricks and roots, quartz crystal clusters and veins, amber resin and drips, magma fractures, void stars and nebula, abyss worn mix), `wallArt.js` (layers `far` / `mid` / `near` / `glow`, plus art lab entries).
- `well.js` now uses 4 sprite layers per biome: far (parallax 0.5), mid (0.75, high only), near edge strips (1.0), glow (additive, slow pulse, high only, steady under Reduce motion). Layers are built one per frame from a queue, so a biome change never makes a long frame. `wallTile.js` is a thin wrapper kept for compatibility. Biome blend and fog are the existing ones (unchanged).
- Tests: `tests/render-art-walls.test.js` (every biome x layer x quality paints without throwing, is deterministic, tiles in y, no-canvas safe). It caught a real seam bug (non-integer frequency multipliers) that is now fixed.

## In progress
- Nothing half-done.

## Next (in order)
2. (done, except embers / haze / spores, see Measurements)
3. Gem models (6 distinct shapes) into the atlas, 6 sizes each, glint strip.
4. Hazard models (bat with 3 flap frames).
5. Bucket and twisted rope (keep `rope.js` API).
6. 26 part icons in `partIcon.js` (keep `draw` and `toDataURL`).
7. Light and atmosphere in `polish/`.
8. Particle sprites and layered effects.
9. Home scene and splash colours.
10. Per-layer cost registration in `quality.js`.

## Measurements (headless Node + @napi-rs/canvas, not a phone; expect about 2-3x slower on a mid Android)
- Wall generation per biome, all 4 layers: 27-75 ms (clay 41, quartz 75, amber 47, magma 34, void 27, abyss 29). Only the current biome is built at start, one layer per frame. All 6: about 250 ms.
- Wall texture memory at DPR 2: about 1.1 MB per biome, about 6.5 MB for all six.
- `well.draw` steady state: 0.1-0.5 ms per frame in Node (all layers, high quality).
- Visual checks done by rendering PNGs headless (all 6 biomes at 360x640, DPR 2; seams checked by stacking tiles). Not yet seen on a real device or at 430x932 / 1440x900 / DPR 1 and 3.
- Still to do for step 2: rising embers, heat haze bands, drifting spores (they belong with the ambience work in step 7, in `polish/ambience.js`).

STATUS: IN PROGRESS
