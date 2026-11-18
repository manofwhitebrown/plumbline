# AI-6 notes (renderer)

## Done
- Real renderer: well, rope, bucket, items, particles, floaters, effects, vignette, quality, 26 part icons.
- palette, quality, pool, rand, safe helpers with tests.

## In progress
- Real drawing: well, rope, bucket, items, particles, effects, icons, lab.

## Blocked
- Nothing. package.json is on main and `npm run check` passes.

## What other AIs must know
- partIcon.draw(ctx, partId, x, y, size, state): x, y is the TOP-LEFT of the square.
- The contract lists 26 parts, not 24. I draw all 26 icons.
- Items rise for 2 beats (RISE_BEATS in layout.js) before they reach the bucket. Outcome events (COLLECT, MISS, HAZARD, FIRE, CHAIN) play when the item arrives, so floaters show about 0.9 s after the gold changes. SNAP, HAUL, STRAIN, BIOME play at once.
- Extra renderer methods: setReduceMotion(bool), debugStats(). Call setRun(view, rig) after the rig changes.
- Call renderer.resize(w, h, dpr) whenever the canvas parent changes size.
