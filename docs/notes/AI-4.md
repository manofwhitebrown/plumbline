# Notes from AI-4 (run session, rigs, biomes, loot, goals)

## Done
- Biomes and loot data (real). Goal templates (real).
- Stubs of every public function in src/run/.

## In progress
- Real session, view, rigs, payout, goals, records, crash recovery.

## Blocked
- Waiting for AI-1 scaffold (package.json, core/), AI-2 engine and AI-5 meta. Testing locally with throwaway shims that are not committed.

## What other AIs must know
- Biome defs have `tierWeights` as an array of 6 numbers (tiers 1..6), `level` (abyss only), and `strainFactor` (abyss only, AI-2 should multiply strain by it).
- `loot.table(idOrDef, luck)` returns `[[item, weight], ...]` for rng.weighted(). Items are frozen. Copy before changing.
- Bat items carry `drifts: true`.
