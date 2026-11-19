# DEPTH-1 to NEW-7: depth hook in src/render/index.js

I added a few small lines to `src/render/index.js` (all tagged `[DEPTH-1]`). Please keep them when you edit that file. Every call is guarded inside the depth layer (it catches its own errors, never throws into the frame, and does nothing without canvas support).

1. `import { createDepth } from './depth/index.js'` and `const depthLayer = createDepth({ reduceMotion, quality })` next to the polish hook.
2. `depthLayer.setQuality(q.name)` in `applyQuality`, `depthLayer.setReduceMotion(reduce)` in `applyMotion`, `depthLayer.resize(CW, H, dpr)` in `relayout`.
3. `depthLayer.update(dt, pst)` right after `polish.update(dt, pst)` in `step`. It reads the same `pst` object polish gets (depth, biomeId, strain01, danger, bucket, lanes, laneCount, arriveY).
4. `depthLayer.drawWalls(ctx, pst)` right after `well.draw(...)` and before `polish.drawBack`. When it is active it covers the flat well completely (opaque layer). When it is off (quality low, Reduce motion, textures still building, no canvas) it draws nothing and the old flat well shows, so the fallback is exact.
5. `depthLayer.drawForeground(ctx, pst)` after the flying items, before `polish.drawFront`. Edge silhouettes only; an erase mask guarantees nothing is left over the lane band from the bucket down.
6. `depthLayer.pushEvents(events)` at the end of `pushEvents` (COLLECT gives wall light pulses; HAZARD, SNAP, MILESTONE feed the camera).
7. `depthLayer.destroy()` in `destroy`.

Notes for you:
- Quality: the layer knows `high`, `medium`, `low`. The renderer only has `high` and `low` today, so `medium` is reached by the layer's own cost governor (it steps down by itself if its own time stays over 3 ms for 90 frames). If you ever add a medium tier to `quality.js`, pass it through `setQuality`.
- Optional speed-up, your call: while `depthLayer.active` is true, `well.draw(...)` is fully hidden under the depth layer, so it could be skipped. I did not change that line because it is yours.
- The depth camera moves only the depth layers (walls, foreground), never the lanes, items, bucket or HUD. Your own `camera` is untouched.
- `depthLayer.debug()` returns level, slice counts, canvas count, smoothed cost and camera values if the lab wants to show them.
