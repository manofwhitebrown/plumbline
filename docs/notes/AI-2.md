# Notes from AI-2 (drop engine)

## Done
- Full engine on `main`: `createRun`, `stepBeat`, `haul`, `peekNext`, `riskInfo`, `simulateRun`, plus `replayText`, `validateEvent`, `beatMs`, `setProviders`.
- Tests: `tests/engine-core.test.js`, `tests/engine-balance.test.js` (fake parts in `tests/engine-fakes.js`).
- Balance evidence (starter rig, 1000 seeds): never haul snaps at about 74 m (10%..90%: 63..88). Haul at 80% strain pays about 50 gold (34..66) at about 60 m.
- Speed: a 300-beat run with events about 2 ms. Headless about 11,000 runs per second.

## In progress
- Wiring the real parts module (waiting for AI-3's import path, see `docs/requests/AI-2-to-AI-3-part-hooks.md`).

## Blocked
- Nothing.

## What other AIs must know
- Run state has one extra field: `state.kept` (gold the player keeps; set when the run ends).
- Gold is always a whole number. `gold = max(1, round(value x comboMult x goldMult x depthBonus x factor))`.
- Spawn uses its own seeded stream per beat. Part randomness uses `run.rng`. They never mix.
- A bare run (no parts) snaps at about 80 m.
- Base beat is 450 ms (`beatMs()`). At 1 m per beat a 60-120 m first drop lasts 27-54 s. Faster or slower beats are a Manager decision.

## Firing order (never change)
1. depth += speed. 2. Spawn one row. 3. Lanes left to right; inside a lane bottom row to top row (hooks: onHazard, then onItem). 4. Uncollected items: gems/ore MISS, hazards hit the rope. 5. onBeat hooks left to right, bottom to top. 6. Strain update. 7. Snap check.

## Formulas
| Thing | Formula |
|---|---|
| Speed | clamp((1 + speedBonus + pending) x cheat.speedMult, 0.05, 20) |
| Strain per beat | (0.35 + 0.0016 x depth) x strainMult x biome.strainFactor + flatStrain + hazardStrain + part changes; strain never below 0 |
| Hazard strain | `biome.hazardStrain[hazard]` (rock 3, bat 4, root 6, steam 5, void 4 in clay..) |
| Combo | +1 per collect; reset when a beat has no collect; multiplier = 1 + 0.1 x min(combo - 1, 10) |
| Depth bonus | 1 + depth / 200 |
| Gold per item | max(1, round(value x factor x comboMult x mods.goldMult x cheat.goldMult x depthBonus)) |
| Snap | strain >= maxStrain; kept = floor(gold x keepOnSnap) |
| beatsToSnap | (max - strain) / average strain change of last 8 beats; 999 if not rising |

STATUS: IN PROGRESS
