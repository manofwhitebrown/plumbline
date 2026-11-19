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
