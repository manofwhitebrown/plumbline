# Notes from AI-4 (run session, rigs, biomes, loot, goals)

## Done
- `src/data/biomes.js`: the 6 biomes, safe `byDepth`, abyss scaling that is cached (no new objects while playing).
- `src/data/loot.js`: spawn tables by biome and luck, cached. `src/data/goals.js`: goal templates.
- `src/run/`: session, view, rigs (+ rig-preview), payout, goals, tally, records, finish, recover, deps, state, index.
- Crash safety: checkpoint every 10 beats (also on pause and when the tab is hidden), recovery pays once as a snap.
- Tests: biomes, loot, goals, payout, view, session, rigs, and 1,000 random sessions (no double pay, no lost pay).

## In progress
- Waiting for AI-2 (engine), AI-5 (meta), AI-3 (parts) and `core/save.js` + `core/loop.js` from AI-1.
  Until they land, `src/run/deps.js` uses safe fallbacks, so nothing breaks. Tests use fakes.
- Play-testing with the real engine at 360x640, 390x844, 430x932 and 1440x900 (needs the screens from AI-7).

## Blocked
- Nothing that stops me. See the request files in `docs/requests/AI-4-to-*`.

## What other AIs must know
- Import from `src/run/index.js`: `session`, `rigs`, `biomes`, `loot`, `goals`, `records`, `payout`.
- Bus events: `run:started {view, seed}`, `run:events {events, view}` (once per beat), `run:ended`, `run:paused`, `run:resumed`,
  `run:aborted {view}` (quit, no results screen), `run:recovered`, `goal:done {goal, view}`, `rig:changed {rig}`.
- `run:ended` has the contract fields (`outcome, gold, kept, depth, bestBefore, newRecord, shardsEarned, goals, partsUsed`)
  plus `summary` (text, biggestGem, bestCombo, gems, parts with fire counts) and `seed`.
  `gold` is what the drop collected. `kept` is what the player actually gets (all of it on a haul, 30%+ after a snap).
- `session.getResult()` returns the last `run:ended` payload, for the Results screen. `session.onFrame(fn)` gives `(dtMs, alpha)` every frame and returns an off function.
- `view` also has `speed`, `beat`, `biome.palette`, `biome.ambience`. `view.risk.beatsToSnap` is capped at 9999.
- `rigs.getRig()` returns a copy. Loadout slots are 0, 1, 2. `rigs.tray()` gives `{partId: copiesLeft}`.
  `rigs.preview(rig)` gives `{combos, power, powerReady, warnings}`. Power fills in over a few calls (6 ms each), so call it again until `powerReady` is true.
- Goals count gems and relics only. `haulStrain` and `cleanRope` goals are offered only after best depth 60 m / 150 m.
- Shards per drop are capped at 150. Cheated drops (`mods.cheat` not null) get no record and no shards.
- Balance reminder for AI-2: with the base tier values (1, 3, 9) a lone Hook in clay may pay under the 40 gold target.
  The biome `goldFactor` numbers in `src/data/biomes.js` are easy to raise. I will run the bot once the engine lands and tune.
