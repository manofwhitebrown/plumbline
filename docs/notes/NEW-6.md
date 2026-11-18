# NEW-6 notes (quality gate and balancer)

## Done
- `suggest.bestRig`: swap hill climbing, 12 seeds, 150 ms budget, tests in `tests/integration-suggest.test.js`.
- Cloned, read CONTRACT section 12, checked `npm run check` (green at start).
- Found a blocker: the engine never calls the parts runtime, so real parts pay 0 gold. See `docs/requests/NEW-6-to-Manager-engine-parts-wiring.md`.

## In progress
- `tools/bot.js` (next).


## Next
- `tools/bot.js`, `tools/balance-report.js`, integration tests, WORDS.md words (gem, ore, danger, step), QA.md log.
- Balance numbers after the engine wiring lands.

STATUS: BLOCKED on engine wiring (first drop pays 0 gold with real parts).
