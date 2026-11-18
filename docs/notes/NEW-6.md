# NEW-6 notes (quality gate and balancer)

## Done
- `suggest.bestRig`: swap hill climbing, 12 seeds, 150 ms budget, tests in `tests/integration-suggest.test.js`.
- Cloned, read CONTRACT section 12, checked `npm run check` (green at start).
- Found a blocker: the engine never calls the parts runtime, so real parts pay 0 gold. See `docs/requests/NEW-6-to-Manager-engine-parts-wiring.md`.

- Integration tests: `tests/integration-meta-save.test.js` (export/import round trip, bad codes, v0 fixture `tests/fixtures/save-v0.json`, offline claim, Collapse flow, odd calls) and `tests/integration-engine-fuzz.test.js` (50,000 random runs, 3,000 beat-by-beat runs with one end event, every part in every biome).
- `docs/WORDS.md`: added gem, ore, danger, step and a say-this-not-that table. Request `docs/requests/NEW-6-to-ALL-plain-words.md`. Tiny edit: fallback Hook text in `src/ui/api.js` ("lane" -> "column").

## In progress
- Waiting for the engine wiring. The bot fails loudly on all 3 styles today: "stuck: no Gold earned for 20 minutes" (real parts pay 0 gold).
- `tools/bot.js` done: 3 styles (haul at 70%, 85%, never), buys parts then upgrades then crew, rebuilds rigs with suggest, fast-forwards time, prints timeline, checks NaN/negative/stuck/unreachable codex unlocks/unused parts/60% part use. Run: `node tools/bot.js [--style=70|85|never] [--hours=6]`. Test: `tests/integration-bot.test.js`.


## Next
- `tools/balance-report.js` (needs engine wiring), full drop to payout to meta and snap path tests with the real engine (same reason), crash recovery test.
- Balance numbers after the engine wiring lands.

STATUS: BLOCKED on engine wiring (first drop pays 0 gold with real parts).
