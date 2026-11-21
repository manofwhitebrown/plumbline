# HUD-2 notes (Drop HUD, pop-ups, plural words)

## Done
- Plural words: new helper src/core/plural.js (`plural`, `countText`), test tests/plural.test.js (helper, real texts, and a scan that fails on a hard-coded "Shards", "gems", "relics", "combos" or "hits" next to a number). WORDS.md has the rule.
- Fixed "+1 Shards" and the same pattern in Results, Rewards (daily, quests, achievements), Contracts, Dive, Wall chips, goal text ("Collect 1 gem", "max 1 hit"), the cheats menu.
- Files outside my list that I touched, one line each, because the task said "everywhere a count is shown": src/ui/screens/results.js, diveUi.js, rewards*.js, contractsUi.js, codexWall.js, wallModel.js, src/meta/contracts.js, src/data/goals.js, src/cheats/catalog-looks.js.

- Goal chips now wrap (two lines, three at most for the longest goal at 320 wide) and never end in "...". Banner, guardian bar and chase pills moved into one column under the goals (src/ui/screens/drop.js, dropPlay.js, dropChase.css, dropPlay.css, drop.css), so they cannot overlap the goals or each other. Strain gauge starts lower (112 px). Combo bubble takes no room until a combo shows.
- I SAW it: real Chromium at 320x568, 360x640, 430x932, worst case forced (26-character goals, all done, combo x100): nothing clipped.

## Next
- Pop-up: 2.5 s, tap to dismiss, queue, hold during the boon picker, never over the HUD.
- Real browser screenshots at 320x568, 360x640, 430x932, 1440x900.

## Honest status
- Two tests fail now and then on clean main too (hook3 render heap check, "a snap pays exactly once"). Not caused by this work.

STATUS: NOT DONE (in progress)
