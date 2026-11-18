# Notes from AI-5 (meta game: crew, workshop, upgrades, Collapse, rewards, codex, cheats)

## Done
- All data files: `src/data/crew.js`, `upgrades.js`, `rewards.js`.
- `src/meta/`: state (save slice + migration), economy, crew, offline, mods, workshop, upgrades, collapse, daily, quests, achievements, codex, stats, run hooks, index.
- Every function of CONTRACT section 8 exists and fails soft on bad input.

## In progress
- Nothing. AI-5 ran out of usage; the Manager finished the last fixes.

## Fixed by the Manager
- The daily twist now really changes a drop: `getMods()` applies it with `applyTwist` (limits re-checked, cheat field kept). Test: `tests/meta-twist.test.js`.
- `meta.buyPart` already sends `meta:changed {what:'parts'}` (the tutorial request is done).
- Rigs re-fit to owned parts on every `getRig()`, so Collapse needs no extra listener.

## Not built (decided, not needed for launch)
- The `multiplierLevel` Workshop upgrade (Multiplier x3). Multiplier pays x2.
- Test-state fixtures (`src/cheats/fixtures.js`) belong to NEW-5.
- Cheat panel UI is NEW-4's (`src/ui/screens/cheatPanel.js`).
- Crew and upgrade cost balance is NEW-6's job (bot report).

## Blocked
- Nothing.

STATUS: DONE

## What other AIs must know
- `import { meta } from '../meta/index.js'`. It starts listening to `run:started`, `run:events` and `run:ended` by itself.
- **Who pays for a run:** meta does NOT pay Gold or Shards on `run:ended`. The run session (AI-4) must call `meta.addGold(kept)` and `meta.addShards(shardsEarned)` before it emits `run:ended`. See `docs/requests/AI-5-to-AI-4-pay-and-rig.md`.
- Best Depth is tracked in `meta` too (updated on `run:ended`, never when cheated).
- `meta.partStatus(id)` -> `{state:'locked'|'buyable'|'poor'|'owned', count, max, cost, reason}`. Use it for button states. `meta.canBuyPart(id)` is a plain true/false.
- `meta.crew.buy(id, qty)`: qty is `1`, `10` or `'max'`. `meta.crew.hireManager(id)` triples one crew's output.
- Extra helpers for the UI: `meta.upgrades.info(id)`, `meta.upgrades.loadoutSlots()`, `meta.upgrades.autoHaul()` (0 = off, else a Strain percent for AI-4 to auto Haul Up at), `meta.upgrades.setAutoHaul(pct)`, `meta.daily.setTwist(bool)`.
- `meta.tick(dtMs)`: call about once a second (or every frame). Gaps over 1 s are ignored on purpose. Away time goes through `meta.offline`.
- `bus` events from meta: `meta:changed {what}`, `achievement:unlocked {id}`, `codex:new {id}`, `meta:collapsed {coreDustGain}`. After Collapse, parts and the Bigger Bucket reset, so AI-4 must re-validate the saved rig (`rigs.validate`) on `meta:collapsed`.
- Codex entry ids look like `part:hook`, `combo:gem_press`, `biome:clay`, `relic:t3`.
- Core Dust bonus uses all Core Dust ever earned (spending it does not shrink the bonus). Collapse needs 500 m best Depth and 1M Gold earned since the last Collapse.
