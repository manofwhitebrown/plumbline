# HOOK-3 notes (Relic Wall + Looks)

## Done
- Data: `src/data/cosmetics.js` (12 Looks: bucket, rope, well; wall bonuses at 10/20/36; hints).
- Relic book: `src/meta/relicBook.js` (slice `relicBook`, files relics from the end of each Drop, gold-dot count, wall bonus numbers). Cheated saves find nothing.
- Looks: `src/meta/cosmetics.js` (slice `cosmetics`, earn by relics/achievements, buy with Shards, equip). Cheated saves cannot earn or buy.
- Tests: tests/hook3-data.test.js, tests/hook3-meta.test.js (tests pass; not seen in a browser yet).

## Next
- Render hook (src/render/cosmeticsHook.js) + Drop and Home calls, then Relic Wall and Looks tabs in the Codex, cheats, words, bonus into getMods.

STATUS: NOT DONE (in progress)
