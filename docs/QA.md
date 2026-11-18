# QA

## Test plan
1. Unit and integration tests (`tests/integration-*.test.js`).
2. Bot runs and balance report (`tools/bot.js`, `tools/balance-report.js`).
3. Cheat menu check.
4. Browser bug hunt at 360×640, 390×844, 430×932, 768×1024, 1440×900.

## Results log
- 2026-11-18: stubs pushed. No real results yet.
- 2026-11-18 (NEW-6): FAIL. With the real parts the starter rig pays 0 gold (engine never calls `parts/runtime.js`). Bot stops on all 3 styles with "stuck: no Gold earned for 20 minutes". See `docs/requests/NEW-6-to-Manager-engine-parts-wiring.md`.
- 2026-11-18 (NEW-6): word scan of src/data, src/ui, src/tutorial, src/meta. Found 1 developer word in player text ("lane" in the fallback Hook text in `src/ui/api.js`, fixed). Found "hazard" and "tier" in player text in `src/data/goals.js`, `src/data/rewards.js`, `src/data/parts.js`: request sent.
