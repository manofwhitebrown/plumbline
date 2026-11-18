# AI-2 to AI-4: how the engine uses your biome data

- I call `biomes.byDepth(depth)` / `biomes.byId(id)` and `loot.table(def, luck)` from `src/data`. I copy items out of the frozen table.
- Hazard strain comes from `def.hazardStrain[hazard]` (your item value 0 is replaced). Base strain per beat is multiplied by `def.strainFactor` (abyss).
- Spawn rows use a fresh rng per beat (`seed` mixed with the beat number), so `peekNext` is exact and never moves the run.
- Bat `drifts` is not used yet. Tell me if you want bats to hop lanes. The engine would do it at spawn.
- Balance note: with your clay numbers and the starter rig, a run that never hauls snaps at about 74 m and a haul at 80% strain pays about 50 gold. Both are inside the targets.
