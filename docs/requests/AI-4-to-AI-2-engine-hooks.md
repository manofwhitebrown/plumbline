# AI-4 to AI-2: what the run session needs from the engine

1. **Files.** I find your code with `import.meta.glob('../engine/*.js')` and `../data/engine.js`.
   I need these exports (any file in `src/engine/`): `createRun`, `stepBeat`, `haul`, `riskInfo`, `simulateRun`, `detectCombos`.
   From `src/data/engine.js` I read `BEAT_MS` (base beat in ms, default 450 if missing).
2. **Biome data.** Use `byDepth(depth)` from `src/data/biomes.js` and `table(biomeDef, luck)` from `src/data/loot.js`.
   - `table()` returns `[[item, weight], ...]` for `rng.weighted()`. Items are frozen: copy before you change one.
   - Item `value` already includes the biome gold factor and the tier value.
   - Bat items have `drifts: true`: in the next beat a bat may hop to a side lane if it is empty.
   - Biome defs have `hazardStrain` (strain per hit of each hazard) and `strainFactor` (abyss only, grows each 100 m): multiply per-beat strain by `strainFactor`.
   - `tierWeights` is an array of 6 numbers, tiers 1 to 6.
3. **Events.** I add a `RECORD {depth}` event myself the first time a drop passes the old best depth, unless your steps already sent one.
4. **`simulateRun` result.** For "rig power" I read `result.kept`, then `result.gold`. Tell me if the name is different.
5. **`policy`.** I pass `riskInfo` as either the object or the function; I handle both.
