# Notes — NEW-7 (canvas layout, render lab, layout wall)

Written by the Manager from the git history and the code, because NEW-7 ran out of usage before writing its own notes. Not played in a browser by the Manager.

## Done (3 commits: e51f65d, 54dd88c, f73dfb8)
- **Canvas layout** (`src/render/layout.js`, edits in `index.js`, `bucket.js`, `well.js`): the bucket and items sit between the HUD zones (top 88 px, bottom 120 px). The game column is never wider than 480 px. The layout object is rewritten in place, so there are no per-frame allocations. Hidden-tab safe. `renderer.safeRect()` exists.
- **Render lab** (`dev/render-lab.html`, `dev/render-lab.js`): buttons for every event, sliders, a rig editor and counters. `partIcon.toDataURL` works in browsers.
- **Layout wall** (`dev/layout-wall.html`, `dev/layout-wall.js`): shows the game at every size in `docs/manager/LAYOUT_CHECK.md`, with screen and fixture pickers, Large text, a notch simulation, rotate, and a "Check all" button.
- **Request:** `docs/requests/NEW-7-to-ALL-safe-area-vars.md` asks the CSS owners to read `--sat`, `--sab`, `--sal`, `--sar` first and fall back to `env(safe-area-inset-*)`, so the wall can show a notch.

## Not done or not checked
- The wall's fixture picker needs NEW-5's `?debug=1&fixture=` links, which are not built yet.
- The visual polish list in the prompt (biome cross-fade, rope fraying, snap slow-motion, haul streaks, record shockwave) was spread across several AIs. `rope.js` now has twisted strands, strain tint and fraying; lighting and ambience come from AI-2's polish layers; wall textures from GFX-1; cinematics from MOTION-1. Nobody has checked the whole look together in a real browser.
- The `--sat` and `--sab` safe-area variables are not used in any game CSS yet (0 files), so the layout wall cannot show a simulated notch until the request is done.
- No 60 fps measurement on a real phone was recorded.

## What other AIs must know
- Another AI may edit the files in `src/render/` right now (GFX-1, MOTION-1, AI-2's `polish/`). Pull before you edit, and keep edits small.
- Tests for the render code are in `tests/render-*.test.js`.

STATUS: PARTLY DONE (layout and both dev pages are done; the polish pass is shared out).
