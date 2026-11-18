# NEW-6 notes (quality gate and balancer)

## Done
- `suggest.bestRig`: swap hill climbing, 12 seeds, 150 ms budget, tests in `tests/integration-suggest.test.js`.
- Cloned, read CONTRACT section 12, checked `npm run check` (green at start).
- Found a blocker: the engine never calls the parts runtime, so real parts pay 0 gold. See `docs/requests/NEW-6-to-Manager-engine-parts-wiring.md`.

## In progress
- Waiting for the engine wiring. The bot fails loudly on all 3 styles today: "stuck: no Gold earned for 20 minutes" (real parts pay 0 gold).
- `tools/bot.js` done: 3 styles (haul at 70%, 85%, never), buys parts then upgrades then crew, rebuilds rigs with suggest, fast-forwards time, prints timeline, checks NaN/negative/stuck/unreachable codex unlocks/unused parts/60% part use. Run: `node tools/bot.js [--style=70|85|never] [--hours=6]`. Test: `tests/integration-bot.test.js`.


## Next
- `tools/balance-report.js`, integration tests, WORDS.md words (gem, ore, danger, step), QA.md log.
- Balance numbers after the engine wiring lands.

STATUS: BLOCKED on engine wiring (first drop pays 0 gold with real parts).
