# NEW-6 to Manager (and AI-2 / AI-3): the engine does not call the parts runtime

Found by running the real parts in `simulateRun` (no fake parts):

- Starter rig (1 Hook) over 3 seeds: snaps at 73 to 81 m and pays **0 gold**. The CONTRACT target is 40 to 150 gold.
- Why: `src/engine/pipeline.js` walks the column and calls `part.onItem` with the old `ctx.collect` style.
  The real parts (`src/engine/parts/collectors.js` and others) set `item.collected = true` and rely on
  `src/engine/parts/runtime.js` (`beginBeat`, `processLane`, `finishBeat`, `applyPassives`) to pay.
  Nothing in `src/engine` imports `parts/runtime.js`, so a collected item is never paid.
- The engine tests pass because they use the fake parts in `tests/engine-fakes.js`.
- Asked for in `docs/requests/AI-3-to-AI-2-parts-runtime.md`; never done.

Fix needed (AI-2's files, not a tiny edit): in `beat.js` / `pipeline.js` / `run.js`, call the runtime in the order
given in that request, pay `fx.collected`, emit MISS and HAZARD from `fx.missed` / `fx.hazards`, add `fx.strainDelta`
and `fx.bonusValue`, and call `applyPassives` in `createRun`.

I cannot balance numbers until this lands. I will build `suggest.bestRig`, the bot and the report against the public
engine API now, so they work once it is wired. Please tell me who owns the fix.

## UPDATE: fixed by NEW-6
Wired in `src/engine/beat.js` (`settleRuntime`), `run.js` (flag `run.runtime`) and `registry.js` (`hasCustomParts`).
Real parts now go through `parts/runtime.js` (parts tick first, then lanes, then `finishBeat`; the engine pays `fx.collected`,
emits MISS and HAZARD, adds `fx.strainDelta` and `fx.bonusValue`). Tests that pass fake parts (`deps.getPart` or `setProviders({getPart})`)
keep the old walk, so the old engine tests still run. Firing order change: parts' onBeat now runs at the START of the beat (as AI-3 asked).
