# GFX-1 notes (art and graphics)

## Done
- Step 1 ART TOOLKIT in `src/render/art/`: `prng.js` (seeded PRNG, text seeds, lattice hash), `noise.js` (value, fbm, ridged, Worley; all tileable with a period), `color.js` (hex/rgb/HSL, mix, lighten/darken toward warm white / ink, ramps), `shapes.js` (rounded polygon, round rect, soft glow, lit gradient, inner shadow, bevel, rim light, contact shadow, facet light from the fixed top-left light), `atlas.js` (shelf packer, `spriteKey(kind,tier,biome,size,frame)`, atlas with named regions, safe without canvas, `destroy()` frees sheets), `registry.js` (list of art for the lab), `swatches.js`.
- `dev/art-lab.html` + `dev/art-lab.js`: grid of every registered art item with quality, zoom, DPR and timing. New generators only need `registerArt({name, group, w, h, paint})`.
- Tests: `tests/render-art-toolkit.test.js` (8 tests: determinism, tiling, ranges, packer overlap, keys, no-canvas atlas).

- Step 2 WELL TEXTURES (`src/render/art/wall*.js`): `wallBase.js` (stone body: height map from fbm/Worley/ridged with domain warp, lit from top-left, crack ambient occlusion, glowing seams, far layer duller and darker with side falloff), `wallShapes.js` (cracks, crystals, resin pockets, honey drips, stars; all wrap top to bottom), `wallBiomes.js` (clay bricks and roots, quartz crystal clusters and veins, amber resin and drips, magma fractures, void stars and nebula, abyss worn mix), `wallArt.js` (layers `far` / `mid` / `near` / `glow`, plus art lab entries).
- `well.js` now uses 4 sprite layers per biome: far (parallax 0.5), mid (0.75, high only), near edge strips (1.0), glow (additive, slow pulse, high only, steady under Reduce motion). Layers are built one per frame from a queue, so a biome change never makes a long frame. `wallTile.js` is a thin wrapper kept for compatibility. Biome blend and fog are the existing ones (unchanged).
- Tests: `tests/render-art-walls.test.js` (every biome x layer x quality paints without throwing, is deterministic, tiles in y, no-canvas safe). It caught a real seam bug (non-integer frequency multipliers) that is now fixed.

- Step 3 GEM MODELS: `art/gemFacets.js` (facet fill lit from top-left, facet rings, rim, glow, specular), `gemModelsA.js` (T1 quartz hexagon with 6 facets + table, T2 emerald step-cut with 3 nested rings, T3 amber teardrop cabochon with a fossil inclusion), `gemModelsB.js` (T4 ruby brilliant with 8 kite facets + table, T5 void angular shard with glowing core and 8-frame swirl, T6 prism with white beam and animated 6-band rainbow, 8 frames), `gemModels.js` (lookup, glint mask), `oreRelic.js` (ore: faceted rock, gold vein, sparkle flecks; relic: wooden chest, brass bands/corners/rivets, glowing keyhole), `itemAtlas.js` (atlas: 6 size steps 0.5-1.5 x, animation frames, 5 glint frames per tier; low = 3 sizes, no animation, no glint), `gemLab.js` (art lab entries).
- Every tier has its own SHAPE (hexagon, rectangle, drop, round brilliant, angular shard, triangle) so colour-blind players can tell them apart. Checked by rendering at 22, 44, 96 and 200 px.
- `items.js` draws gems, ore and relic from the atlas (`itemSprites.js` builds it). Glint every ~3 s, void/prism animate at 5 steps per second (no flashing), both off on low quality and Reduce motion. `index.js` got two one-line hooks (`items.setLow`, `items.setReduceMotion`) and frees the atlas on destroy.
- Tests: `tests/render-art-gems.test.js` (7 tests: tiers differ, determinism, frames, size picking, atlas keys, memory caps, no-canvas safe).

- Step 4 HAZARD MODELS: `art/hazardRim.js` (the shared red-orange rim and danger glow; gems never use it), `hazardModelsA.js` (rock: spiky boulder with glowing cracks; bat: 3 pre-rendered wing frames, scalloped wings, finger bones, glowing red eyes, fangs; root: thick twisting root with bark ridges and thorns), `hazardModelsB.js` (steam: three layers of round puffs with a hot base, 3 billow frames, plus a dashed warning ring; void orb: near-black sphere, violet horizon ring, lensing arc, 3 orbiting dots; warn glow), `hazardLab.js`.
- Hazards are in the same atlas (`itemAtlas.js`, keys `spriteKey('hz', 0, name, BASE_IDX, frame)`). `itemSprites.js` is now just a thin wrapper. `items.js` draws them: warning glow pulses about 1.4 times a second; bat wings 4 steps at 110 ms; steam frames every 340 ms and ring pulse about 0.6 Hz; root sways; void dots orbit. Reduce motion: everything still (steady glow, bat level, no sway, no spin). Low: bat still flaps (needed to read), steam one frame, dots do not spin.
- `atlas.js` got `overflowSize` (extra sheets can be smaller, so a few more sprites do not cost a whole sheet).
- Looked at at 22/44/96/200 px and side by side with the gems at 24 px: hazards have a thick red-orange rim and angular or organic silhouettes, gems are polished and unrimmed, so they cannot be confused. Fixed two problems found by looking: the root's rim was hidden under its own body, and the steam was a glowing white ball (now real puffs).
- Tests: `tests/render-art-hazards.test.js` (7 tests).

- `wallTexture(biomeId, layer)` added to `src/render/art/index.js` (file `art/wallTexture.js`), as DEPTH-1 asked (`docs/requests/DEPTH-1-to-GFX-1-wallTexture.md`): 160 x 192 canvas, tiles top to bottom (checked by stacking), crisp stone with biome details, lit from the left, no vignette, cached per biome, built lazily, null without a canvas (the depth layer then keeps its own texture). About 10-20 ms per biome when warm in Node. `disposeWallTextures()` frees them. Tests: `tests/render-art-walltexture.test.js`.
- COORDINATION NOTE: while doing steps 5 and 6 I found that a second GFX-1 session had already pushed the twisted rope tiles and hero lantern (b0fa6b1) and the 26 hero icons (c9517e9), and MODEL-1 owns the baked barrel in `bucket.js`. I dropped my duplicate versions rather than overwrite them. They are kept, unmerged and unused, on the branch `gfx-1-alt-rope-icons-bucket` (rope strip tile + strain multiply tint, wooden stave bucket body with brass hoops, icon tile style). Please run only one GFX-1 session, or split the steps between sessions.

## In progress
- Nothing half-done.

## Next (in order)
2. (done, except embers / haze / spores, see Measurements)
3. (done)
4. (done)
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
- Items atlas with hazards: build 14-26 ms (104 sprites), 5 MB at DPR 2 for a 44 px item (2 MB on low); (before hazards it was 4 MB); a gem draw costs about 5 us. Typical item size is about 6% of screen width (22-45 px). Texture memory so far: walls 6.5 MB + items 4 MB = about 10.5 MB of the 24 MB budget.
- A halo bug found by looking at renders: the soft glow behind gems did not fade to zero at the sprite edge (faint square). Fixed by limiting the glow radius to half the sprite.
- Still to do for step 2: rising embers, heat haze bands, drifting spores (they belong with the ambience work in step 7, in `polish/ambience.js`).

STATUS: IN PROGRESS
