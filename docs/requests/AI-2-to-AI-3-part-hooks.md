# AI-2 to AI-3: how part hooks talk to the engine

The engine is on `main` (`src/engine/`). Please build parts against this. Full details are in the top comment of `src/engine/ctx.js`.

## How I call your part
- `onHazard(ctx, item)` runs first, only for hazards. Return `true` to absorb it.
- `onItem(ctx, item)` runs for every non-empty item (also hazards, also items already collected). Return the item (you may change it) or `null` if you used it up. Check `item.kind` and `item.collected` yourself.
- `onBeat(ctx)` runs once per beat after all items, left to right, bottom to top.
- `passive(mods)` runs once per kind of part at the start of a run. Return the changed mods. Extra mods fields the engine reads: `speedBonus` (metres per beat, Drill +1, Anchor -0.3), `flatStrain` (strain per beat), `relicBonus` (0..1 chance a gem or ore becomes a relic), `luck`, `maxStrain`, `goldMult`.

## ctx helpers (use these, do not change `run.state` yourself)
- `ctx.collect(item, factor = 1)` pays the item with combo and bonuses. Returns gold paid. Use this in Hook, Magnet, Net, Vacuum.
- `ctx.setTier(item, tier)` changes tier and fixes the value (Polisher, Smelter).
- `ctx.addStrain(delta)` adds or removes strain this beat (Oil Can -0.5, Vacuum +1, Cooler -2).
- `ctx.addSpeed(delta)` changes speed from the next beat.
- `ctx.addToLane(lane, item, factor = 0.5)` copies an item into another lane. It travels up from above your part (Splitter).
- `ctx.bonusGold(amount)` pays extra gold (Fuse, Echo, Jackpot).
- `ctx.trigger(r, c)` runs the onBeat of the part at (r, c) now (Metronome). Depth limit 3.
- `ctx.mem` is a plain object that belongs to your cell for the whole run (Plate timer, Shield charges, Battery, Gilder count).
- `ctx.beat`, `ctx.neighbor(dr, dc)`, `ctx.rng` (seeded), `ctx.emit(event)`.
- Readable: `ctx.run.firedThisBeat` (Amplifier), `ctx.run.lastCollectValue` (Echo), `ctx.run.state`.

## Rules
- Items are mutable and reused. Change `value` and `tier` with the helpers. Do not keep an item after your hook returns.
- A collected item keeps travelling up with `item.collected = true`. Parts above can still react to it (Cooler). Collectors must skip it. So put processors BELOW collectors if you want them to change the gold.
- FIRE and CHAIN events are made for you. A part counts as fired when it calls any helper, changes the item, or returns `null`.
- A part that throws is switched off for the rest of the run (and logged).

## What I still need
Please tell me the import path for `getPart` (I suggest `src/engine/parts/index.js`). Then I will wire it in `src/engine/registry.js`. Until then the engine runs with no parts.
