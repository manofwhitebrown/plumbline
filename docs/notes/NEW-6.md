# NEW-6 notes (quality gate and balancer)

## Done
- `suggest.bestRig`: swap hill climbing, 12 seeds, 150 ms budget, tests in `tests/integration-suggest.test.js`.
- Integration tests: `tests/integration-meta-save.test.js` and `tests/integration-engine-fuzz.test.js` (50,000 random runs, every part in every biome).
- Engine wiring (real parts pay Gold) was fixed earlier; see `docs/requests/NEW-6-to-Manager-engine-parts-wiring.md`.
- `docs/WORDS.md` plain-words table and request `NEW-6-to-ALL-plain-words.md`.
- `tools/bot.js`: 3 play styles (haul at 70%, 85%, never), buys parts, upgrades, crew, rebuilds rigs, prints a timeline, checks NaN/negative/stuck/unreachable unlocks/unused parts.
- `tools/balance-report.js`: finished. `node tools/balance-report.js --out=docs/BALANCE.md` prints and writes the report; exit code 1 when a target is missed.
- **Balance pass (this round)**, found with the bot:
  - Gold was not the real problem, the missing Gold sink was. By 3 h every Gold upgrade was maxed, Rope stopped at 180 max Strain and depth stalled near 260 m, so the 500 m Collapse gate was unreachable.
  - Rope is now 20 levels of +45 max Strain (100 to 1000), cost growth 2.1. `getMods` reads `per` from `src/data/upgrades.js` (it was hard-coded 10 for rope and 4% for grease).
  - Beat length 450 ms to 800 ms (`ENGINE.baseBeatMs`). First drop: never haul 50 to 70 s, haul at 80% 38 to 58 s (median 47 s). Target is 45 to 90 s.
  - **Integration bug found:** `src/run/deps.js` looked for `BEAT_MS` in the engine data and fell back to a hard-coded 450, so `ENGINE.baseBeatMs` was ignored in the live game. It now reads `ENGINE.baseBeatMs`.
  - First Collapse by the bot: never haul 2.0 h, haul 85% 2.2 h, haul 70% 2.7 h. Target 2 to 3 h.
  - The "part in over 60% of best rigs" check was unfair (a 20-cell rig and 19 owned parts means nearly everything is in it). It is replaced by a ban test: rebuild the best rig without the part and flag the part only if Gold drops by more than 70% (`partImpacts`, `MUST_HAVE_LOSS`).
- Tests: `tests/integration-balance.test.js` guards beat wiring, first drop length, rope ceiling, Collapse window, part impact.
- `docs/BALANCE.md` is the latest generated report.

## Known and honest
- Cooler (63% when banned for the 70% hauler) and Net (62% for the 85% hauler) are the closest to must-have. Under the 70% line, but worth a look if the designer wants more variety.
- The 70% style only just reaches 500 m (best 500 to 510). A cautious player may need a few more Deep Start levels; that is intended.
- Late drops are long now (300+ beats is about 4 minutes at 800 ms). Speed-ups from Drill/Anchor shorten them. If this feels slow in a real playtest, lower `baseBeatMs` and re-run `balance-report`; first drop must stay at 45 s or more.
- Everything above comes from the bot, not from a human. Numbers need a real playthrough.

## Next
- Full drop to payout to meta and snap path tests with the real engine, crash recovery test.

STATUS: DONE for balance and tools. Needs a human playtest to confirm the feel.
