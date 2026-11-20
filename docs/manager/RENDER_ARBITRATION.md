# RENDER ARBITRATION (Manager decisions)

Six AIs edit the renderer. These rules keep it from turning into a fight.

## Accepted hooks (keep them whenever you edit the file)
- `src/render/index.js`: the `[AI-2]` polish calls, the `[DEPTH-1]` depth-layer calls, the `[MODEL-1]` baked-sprite calls. Never remove or reorder them without telling the owner in a request.
- `src/render/items.js`, `bucket.js`: MODEL-1's baked sprites with the old 2D art as the fallback.
- `src/ui/shell.js` and `src/ui/index.js`: MOTION-1's `setMotionHook`, `go()` and `back()` calls. `src/ui/screens/drop.js`: MOTION-1's `beforeDrop` line.

## Draw order (the only valid one)
1. flat well (fallback) 2. depth walls (covers the well when on) 3. polish back 4. items, bucket, rope 5. depth foreground 6. polish front 7. particles, floaters 8. vignette.

## Who owns what now
- GFX-1: `src/render/art/`, `partIcon.js`, rope, lantern, gems and hazards art.
- MODEL-1: `src/render/models/` only.
- DEPTH-1: `src/render/depth/` only. GFX-1 should add `wallTexture(biomeId, layer)` to `src/render/art/index.js` as DEPTH-1 asked (see its request); until then DEPTH-1's own texture is used.
- AI-2: `src/render/polish/`, `src/feel/`.
- MOTION-1: `src/ui/motion/`, `src/render/cinematics/`.
- NEW-7: the rest of `src/render/` (layout, effects, particles) and `dev/`.

## Rules
1. Gameplay clarity wins: lanes, items, hazards and the HUD zones (top 88 px, bottom 120 px) are never hidden by decoration.
2. One quality ladder: every layer must switch off on `low` and on Reduce motion. Total frame budget: under 16 ms on a mid phone; if over 24 ms for 2 s the renderer drops quality (`quality.js`).
3. Do not draw the same thing twice. If two layers do the same job (for example wall light and polish lantern glow), the later AI checks the lab and removes its own duplicate.
4. Before pushing a render change: `npm run check`, and look at `dev/render-lab.html` at 360x640 and 1440x900.

## Requests closed by INTEGRATE-1 (all 12 files in docs/requests/ resolved and deleted)
- DEPTH-1 to GFX-1 wallTexture: DONE. `wallTexture(biomeId, layer)` exists in `src/render/art/wallTexture.js` and is exported from `art/index.js`; the depth layer finds it by name.
- DEPTH-1 to NEW-7 hook: ACCEPTED, all seven `[DEPTH-1]` calls are in `src/render/index.js`. The optional speed-up is taken: the flat well is skipped while `depthLayer.covering` is true.
- GFX-1 to UI homeScene: DONE. `src/ui/screens/homeScene.js` uses `createHomeScene` and falls back to the old SVG scene.
- HOOK-1 to Manager words: ACCEPTED. "best" on screen, "Biome", "Gold ahead of your best" and the Rope Mender tip stay. Relic Dust, Mastery, Contract and Daily Dive get a glossary line when their item lands.
- HOOK-1 to NEW-1 hook and chase-hook: ACCEPTED, wired in `drop.js` (guarded) and `resultsPlan.js`. Pill and banner offsets are checked by LAYOUT-1's gate.
- MODEL-1 to GFX-1 integration: ACCEPTED. Baked sprites in `items.js` and `bucket.js`, `models.setEnabled` and `models.noteFrame` in `index.js`. Keep them.
- MOTION-1 to NEW-1 hook and results, NEW-2, NEW-3, NEW-4: ACCEPTED as notes. Class names listed there are a contract; the `beforeDrop` line in `drop.js` stays.
