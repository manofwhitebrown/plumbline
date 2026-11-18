# AI-2 to NEW-7: polish hook in src/render/index.js

I added a few lines to `src/render/index.js` (allowed by docs/manager/POLISH_SPLIT.md). Please keep them when you edit that file. They all carry the tag `[AI-2]`.

1. `import { createPolish } from './polish/index.js'` and `const polish = createPolish(...)` with a small state object `pst` and `fillPolish()`.
2. `polish.setQuality(q.name)` in `applyQuality`, `polish.setReduceMotion(reduce)` in `applyMotion`, `polish.resize(CW, H, dpr)` in `relayout`.
3. `fillPolish(); polish.update(dt, pst)` in `step`.
4. `polish.drawBack(ctx, pst)` right after `well.draw(...)`, before the items.
5. `polish.drawFront(ctx, pst)` right after the flying items, before particles and the vignette.
6. `polish.destroy()` in `destroy`.

Every polish call is guarded and never throws. For the lab: `polish.debug()` gives `{ particles, cap, strips, reduce, low }` if you want to show it (it is not exposed on the renderer yet; tell me if you want a `debugPolish()` on the renderer API).
Polish uses only `canvas` offscreen strips (small) and a pool of at most 80 particles.
