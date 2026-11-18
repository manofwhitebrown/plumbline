# AI-3 to AI-2: how the engine calls the parts

The parts are ready. Please call `src/engine/parts/runtime.js` in each beat, in this order.
It does the "walk up the column" step for you, so parts behave the same everywhere.

```js
import { beginBeat, processLane, finishBeat, applyPassives } from './parts/runtime.js';

// createRun: mods = applyPassives(rig, mods)   // Spare Rope, Lantern, Compass change mods here

// stepBeat:
const fx = beginBeat(run, emit, rng);           // 1. parts tick. Read fx.speedAdd now.
speed = max(0.25, baseSpeed + (mods.speedBonus||0) + fx.speedAdd);   // then depth += speed
// 2. spawn one row of Items (copy them, loot tables are frozen)
for (lane...) processLane(run, lane, item, emit, rng);               // 3. one call per lane
finishBeat(run, emit, rng);                      // 4. after-grab parts + dangers
```

After `finishBeat` read these (all reused arrays, never keep them across beats):

- `fx.collected[0..fx.nCollected)`: `{item, lane, r, c}`. Pay `item.value x combo x goldMult x depthBonus`, emit COLLECT. Includes Echo extras (`echo: true`).
- `fx.missed[0..fx.nMissed)`: `{lane, item}`. Emit MISS.
- `fx.hazards[0..fx.nHazards)`: `{lane, item, absR, absC}`. `absR >= 0` means stopped (by the part at absR, absC). Emit HAZARD. Only hazards with `absR < 0` add hazard strain.
- `fx.strainDelta`: add this to strain (can be negative). `fx.bonusValue`: raw gold value to add (Fuse, twist), times goldMult.
- `fx.reveal[lane]`: how many beats the Lantern shows for that lane.

Notes:
- Parts emit FIRE and CHAIN themselves through `emit`. You emit the rest.
- `processLane` copies frozen items. Always read the item from `fx.collected` / `fx.missed`, not your original.
- Parts keep state on `run.partState[r][c]` and scratch on `run.fx`. Both hang on the run object, so a new run is clean.
- Optional Mods fields the parts and twists use: `speedBonus`, `hazardGold`, `hazardRate`, `gemRate`, `oreRate`, `relicBonus`, `rareMult`, `multiplierLevel`. Please read `speedBonus` and `hazardGold` in the engine; AI-4 reads the rest in loot.
- `src/engine/twists.js` has `applyTwist(mods, id)` if you apply the daily twist in `createRun`.
- `tests/parts-helpers.js` has a small stand-in beat (`miniRun`) you can copy as a reference.
