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

- Step 7 LIGHT AND ATMOSPHERE. Checked each item against what already exists, and only added what was missing (RENDER_ARBITRATION rule 3: do not draw the same thing twice):
  - Lantern light on the walls, darker away from the bucket, with flicker: already done by DEPTH-1 (`depth/walls.js` lantern lobes, shade mask) and AI-2 (`polish/lighting.js` lantern glow, bucket glow). Not duplicated.
  - Coloured light from gems: DEPTH-1 tier-coloured pulses on collect, AI-2 bloom where gems arrive. Not duplicated.
  - Light shafts from the top, fading with depth: AI-2 `lighting.drawCone`. Not duplicated.
  - Far wall duller and darker (depth-of-field feel): my far wall layer (`wallBase.js`, desaturated, darker, side falloff) and DEPTH-1's dark far wall.
  - Subtle vignette: `vignette.js` (unchanged). Fog that thickens with depth: `well.js` and `depth/walls.js`.
  - NEW: per-biome colour grade, `polish/grade.js` (soft-light tint, 12-16% strength, cross-fades with the 15 m biome blend, drawn in `drawBack` so gems, hazards and the bucket keep their true colours; off on low quality). 2-line hook in `polish/index.js`. Tests: `tests/polish-grade.test.js`.
  - Low-quality walls now sample every 4 px instead of 8 (8 px looked blocky).
  - Gameplay objects stay higher in contrast than the background: the grade never touches them.

- Step 8 PARTICLE AND EFFECT SPRITES: `art/fxSprites.js` pre-renders 7 soft sprites (spark, ember, dust, glint 4-point star, coin glint, shockwave ring, confetti shard) per colour on first use, cached (cap 72 entries high, 28 low, white fallback when full). `particles.js` draws kinds 0-3 and 6-8 with one `drawImage` each when sprites exist, flat shapes otherwise (no canvas). New kinds: 6 coin glint, 7 confetti, 8 ring. Layered effects in `effects.js`: COLLECT (tier-coloured ring + glint), SNAP (shockwave + dust), HAUL (10 coin glints), RECORD (24 confetti + second ring). All only on high quality and when `fx.state.extras` is on; confetti also off under Reduce motion. The flash limiter now applies always: never more than 3 flashes per second. Particle cap stays 300 (polish cap unchanged, under 120).
- Step 9 HOME AND SPLASH ART: `art/homeArt.js` (layout, crew slots, fireflies, painters) and `homeScene.js` (`createHomeScene`). Two cached layers, colours match the splash (ink #070a12, gold, brass). Crew 0-8 never leave the screen and adding crew never moves existing ones. Low: pixel ratio 1, 4 fireflies, no drift. Reduce motion: one still frame, no loop. Not wired into the Home screen (UI-owned): see `docs/requests/GFX-1-to-UI-homeScene.md`. The splash in index.html was not touched.
- Step 10 QUALITY AND SAFETY: `quality.js` has `registerLayer(name, {importance, cost, off, on})` and `layerState()`. When frames stay slow for 2 s it switches off ONE layer per window (least important first, costliest first among equals) and only goes to 'low' when none is left. `set('high')` brings every layer back; a throwing layer cannot break the loop. Registered in `index.js`: `fx-extras` (importance 1) and `particle-trim` (cap x 0.6, importance 2). Without layers the behaviour is unchanged. Texture code is seeded, returns null/false without a canvas, and every new module has `destroy()`.
- Tests: `tests/render-gfx-fx.test.js` (colour parsing, 7 sprite kinds, cache cap and memory, determinism, no canvas, particle sprite path and 300 cap, layered effects on/off/low, flash limiter) and `tests/render-gfx-home-quality.test.js` (layout, crew, fireflies, no canvas, memory, quality layers and old behaviour). Full `npm run check`: 864 tests, 0 failures.

## Measurements (Node, @napi-rs/canvas; a phone will be slower, so treat as relative)
- fx sprites: 3 ms, 19 sprites, 684 KB at dpr 2 (cap about 5 MB at dpr 3).
- Home scene: 7.6 ms build, 6.2 MB at 430x932 dpr 2, 0.2 ms per frame.
- Not measured: real phone frame times with 300 particles (no device here).

## In progress
- Nothing half-done.

## Next
- Home screen owner: switch to `createHomeScene` (request file above).
- Embers, heat haze and spores for the magma/abyss walls (step 2 leftovers) could now use the ember sprite.

STATUS: DONE
