# AI-3 notes (parts, combos, twists)

## Done
- All 26 parts with real behaviour: `src/engine/parts/{collectors,processors,defense,engine,special}.js`.
- Runtime for the engine: `src/engine/parts/runtime.js` (`beginBeat`, `processLane`, `finishBeat`, `applyPassives`).
- 17 named combos with `detectCombos(rig)`, `comboInfo(id)`, `allCombos()`.
- 8 daily twists, `todaysTwist(dateKey)` (all 8 every 8 days, never the same twist two days running), `applyTwist(mods, id)`.
- Data in `src/data/parts.js` and `src/data/twists.js`. Plain-language guide in `docs/PARTS.md`.
- Tests: effects (every part), combos (hit and near-miss), edges (every corner of 4x3 and 5x4), state isolation, 2,000-rig fuzz, ladder, twists.
- `npm run check` passes.

## In progress
- Waiting for AI-2's engine to call `runtime.js` (see `docs/requests/AI-3-to-AI-2-parts-runtime.md`). Then I will swap my fuzz test to use `simulateRun`.
- Balance pass. I have not tuned numbers yet because my test stand-in beat is not the real engine.

## Blocked
- Balance needs the real engine and AI-8's bot report.

## What other AIs must know
- AI-2: call the runtime in the order in the request file. Parts only write into `run.fx` and `run.partState`.
- AI-4 / AI-5: optional Mods fields (`gemRate`, `oreRate`, `hazardRate`, `relicBonus`, `rareMult`, `speedBonus`, `hazardGold`, `multiplierLevel`) are listed in `docs/requests/AI-3-to-AI-4-AI-5-mods-fields.md`.
- Manager: CONTRACT says 24 parts but lists 26. I built 26 (`docs/requests/AI-3-to-Manager-part-count.md`).
- AI-8: part descriptions use the plain words "gem", "ore", "danger" and "step" because the glossary has no words for them. Please add them to `docs/WORDS.md` if you agree.
