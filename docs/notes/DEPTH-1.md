# DEPTH-1 notes (shaft depth layer)

## What it is
`createDepth({ quality, reduceMotion })` in `src/render/depth/`. One offscreen layer per frame (backdrop, far wall, ~90 perspective wall slices per side, ribs and door rings, shade mask, fog, lantern and gem-pulse light), blitted once with the depth camera. Edge silhouettes are drawn in a second small layer with an erase mask. Hook: `docs/requests/DEPTH-1-to-NEW-7-hook.md`. Texture request: `docs/requests/DEPTH-1-to-GFX-1-wallTexture.md` (not built yet, so a temporary stone texture is generated).

How the depth works: a feature `dz` metres below the camera sits on screen row `vanish - A/dz` (vanishing row below the bucket). Wall texture row = `rpm * world depth`, so it scrolls with depth, near rows (top) rush and far rows (bottom) crawl. Slice tables are precomputed; per frame only a texture offset is added. Biome blend is spatial: each slice picks its biome from its own world depth and cross-fades over the last 15 m before an edge; a stone door ring passes the bucket row exactly at the edge depth. Foreground silhouettes are a pure function of depth (no timers, no pools), so a haul reverses them exactly.

Quality: high = everything; medium = fewer slices, no far wall, no motion blur, translate-only blit, smaller layer; low and Reduce motion = draw nothing (the renderer's flat well shows, exact old look). The layer times itself and steps down on its own if it stays over 3 ms for 90 frames.

## Preview findings (tools/depth-preview.js, real renderer, 360x640 and 430x932, six biomes, five depths each)
Round 1: it already read deeper than the flat well, but walls were muddy and the far wall made the top busy. Round 2: far wall dimmed, wall edge feathered (slice steps and a dotted edge line were visible), lantern lobes brightened, far haze added, door rings made readable. Silhouettes were tiny slivers because 5 lanes at 360 px leave only 30 px beside the lanes: replaced the hard width limit with an erase mask (they can be big above the bucket, and are cleared over the lane band from the bucket down). Round 3: backdrop brightened after a pixel check showed the lane band was too dark in void and abyss.
Measured (no items, lane band, depth vs flat): contrast (std) is lower or equal in every biome and size (about 0.03 vs 0.03 to 0.06; 0.01 to 0.02 vs 0.02 to 0.05 at 430x932), mean luminance is lower: clay and quartz about 0.8 to 0.9 of flat, magma and void about 0.65 to 0.75, abyss about 0.5 to 0.6. Gems stay clear. Dark hazards in void and abyss have somewhat less background contrast than before: worth a look by whoever owns hazard sprites. `tests/depth-readability.test.js` guards std (not busier) and mean (floor 0.5 of flat).
Not good yet: silhouettes are subtle and sparse (they are meant as occasional sweeps, but they compete with polish's flat wall detail strips at the same edges); door ring at the edge looks fine alone but I did not tune it against items.

## Frame time (HONEST: not verified on a phone)
No browser or device here, so `npm run dev` frame time was NOT recorded. `node tools/depth-preview.js --bench --quality high|medium` times the layer alone on node-canvas (a software rasteriser, much slower than a phone GPU canvas): high p50 6.3 ms, p95 13.6 ms; medium p50 3.3 ms, p95 5.5 ms. High is over the 3 ms budget on that canvas. Where it goes (flushed per stage): far wall 1.4, slices 1.0, fog 1.0, light 1.3, mask 0.3, ribs 0.1. Slice draw calls are cheap; the cost is full-layer fills. On a GPU canvas these should be far cheaper, but that is unproven. Please measure on a real mid-range Android: `debugDepth` is not wired, use the renderer's `depthLayer.debug().costMs` (smoothed ms) from the lab. The governor will move a slow device to medium then low by itself.

## Tests
`tests/depth-math.test.js` (slice table, seams at any depth, depth model, camera clamp, edges equal polish), `depth-layer.test.js` (quality ladder, Reduce motion, NaN and hostile state, no canvas, camera caps under event storms, 10,000 updates with zero pool and canvas growth, governor, forced biome, injected art texture), `depth-foreground.test.js` (erase mask covers the lane band, placement, haul reversal, HUD dimming), `depth-readability.test.js` (pixel check; skipped without dev-only `@napi-rs/canvas`, install with `npm i --no-save @napi-rs/canvas`; I did not add it to package.json, which is not mine).

## Open items
- Device frame time (above). Decide whether to keep high at 1.25 layer scale on dpr 2 phones.
- GFX-1 `wallTexture`, and NEW-7 may skip `well.draw` while `depthLayer.active`.
- Reduce motion draws no depth at all (per brief: falls back to the flat well).

STATUS: NOT DONE - implemented, tested and pushed, but the 60 fps / 3 ms claim is unverified on a device and high is over budget on the CPU canvas.
