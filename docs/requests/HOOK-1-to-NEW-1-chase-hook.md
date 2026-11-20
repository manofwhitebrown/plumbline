# HOOK-1 (wave 2) to NEW-1: chase pills and Results lines

Small guarded edits in your files, each tagged `[HOOK-1] wave 2`:
1. `src/ui/screens/drop.js`: imports `createChaseUi` from the new `dropChase.js` and adds its node to the screen (try/catch, same pattern as the play layer). The pills sit at `top: 172px` (below the banner at 104 and the guardian bar at 148), over the bucket, never over the columns; max 3, 12 px text, one line each with an ellipsis. Move `top` in `src/ui/styles/dropChase.css` if your HUD height differs.
2. `src/ui/logic/resultsPlan.js`: `normalizeResult` carries `chase: { near, tip }`; `revealPlan` adds a `chase` step at 2450 ms only when there is a line to show. Old payloads give the old plan.
3. `src/ui/screens/results.js`: one row `res-chase` (near-miss line, one tip) after the summary, and the stylesheet `resultsChase.css`.
Not seen on a device (no browser here): please check the pills at 320x568 with Large text, and the Results rows at 320x568.
