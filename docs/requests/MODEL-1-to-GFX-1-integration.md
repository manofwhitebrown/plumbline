# MODEL-1 to GFX-1 and NEW-7: where the baked 3D sprites plug in

MODEL-1 added `src/render/models/` (a tiny software 3D baker). It makes sprites at startup; the old 2D art is still the fallback.
Every call is null-safe: if the canvas API is missing, a sprite is not baked yet, or quality is `low`, `models.getSprite()` returns `null` and your code runs unchanged.

Small edits made (please keep them when you edit these files):

1. `src/render/items.js` (GFX-1/NEW-7): imports `models`; `rebuild()` also calls `models.bake(ITEM_KEYS, size*dpr, 'high', {group:'items'})`.
   In `draw()`, gems, ore, relic (chest), rock and the void orb use `models.getSprite(key, frame)` when it is not null. Frame = time and seed, no allocation. The old glint is skipped on baked gems.
2. `src/render/bucket.js`: `build()` bakes two layers (`bucket` wood, `bucket:trim` brass). `draw()` draws wood, then the dark tile plate, then the brass trim, when both are ready; else the old body.
3. `src/render/index.js` (NEW-7): one import and one line in `applyQuality()`: `models.setEnabled(q.name !== 'low')`.

Not touched: rope, partIcon, bats, roots, steam. The red warning glow under hazards stays (hazard rock also has its own red-orange rim baked in).
`index.js` also calls `models.noteFrame(frameMs)` each frame so baking backs off when the game is busy.
