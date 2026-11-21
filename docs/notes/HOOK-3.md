# HOOK-3 notes (Relic Wall + Looks)

## Done
- Data: `src/data/cosmetics.js` (12 Looks: bucket, rope, well; wall bonuses at 10/20/36; hints).
- Relic book: `src/meta/relicBook.js` (slice `relicBook`, files relics from the end of each Drop, gold-dot count, wall bonus numbers). Cheated saves find nothing.
- Looks: `src/meta/cosmetics.js` (slice `cosmetics`, earn by relics/achievements, buy with Shards, equip). Cheated saves cannot earn or buy.
- Tests: tests/hook3-data.test.js, tests/hook3-meta.test.js (tests pass; not seen in a browser yet).

- Render hook `src/render/cosmeticsHook.js` + 3 guarded calls in `src/render/index.js` (well wash, rope tint, bucket frame tint) and 2 in `src/render/homeScene.js` (well glow, live rope/bucket). Tints only, gradients cached, no per-frame allocation (test). Bucket tint skips the tile plate; rope tint fades out as Strain rises; the well wash is skipped on low quality. Tests: tests/hook3-render.test.js (real canvas pixels).


- Cheats: src/cheats/catalog-looks.js (Show every relic on the Wall, Unlock every Look) + docs/CHEATS.md. Tests: tests/hook3-cheats.test.js.
- Words: docs/WORDS.md section "Relic Wall and Looks".
- Real Drop check: tests/hook3-drop-relic.test.js runs the real engine, session and finish code; a relic found (seed 1 finds Root Charm) reaches the Wall. Tests pass (full check 992 pass).
- Found while checking: the earlier Wall and Looks tab screens and tests/hook3-meta.test.js were never pushed to main, so they were not in the repo.

## Next
- Wall and Looks panels (own files), request notes, browser check.
- Wall and Looks panels written: src/ui/screens/codexWall.js (panels), wallModel.js (plain data), wallShapes.js (31 relic pictures), src/ui/styles/wall.css. Tests: tests/hook3-wall-model.test.js. They only show once the Codex owner adds the two tabs (request note next).
