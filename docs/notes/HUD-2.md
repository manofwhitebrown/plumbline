# HUD-2 notes (Drop HUD, pop-ups, plural words)

## Done
- Plural words: new helper src/core/plural.js (`plural`, `countText`), test tests/plural.test.js (helper, real texts, and a scan that fails on a hard-coded "Shards", "gems", "relics", "combos" or "hits" next to a number). WORDS.md has the rule.
- Fixed "+1 Shards" and the same pattern in Results, Rewards (daily, quests, achievements), Contracts, Dive, Wall chips, goal text ("Collect 1 gem", "max 1 hit"), the cheats menu.
- Files outside my list that I touched, one line each, because the task said "everywhere a count is shown": src/ui/screens/results.js, diveUi.js, rewards*.js, contractsUi.js, codexWall.js, wallModel.js, src/meta/contracts.js, src/data/goals.js, src/cheats/catalog-looks.js.

- Goal chips now wrap (two lines, three at most for the longest goal at 320 wide) and never end in "...". Banner, guardian bar and chase pills moved into one column under the goals (src/ui/screens/drop.js, dropPlay.js, dropChase.css, dropPlay.css, drop.css), so they cannot overlap the goals or each other. Strain gauge starts lower (112 px). Combo bubble takes no room until a combo shows.
- I SAW it: real Chromium at 320x568, 360x640, 430x932, worst case forced (26-character goals, all done, combo x100): nothing clipped.

- Pop-ups finished (finished by FIX-1 at the owner's request): src/ui/components/toast.js, one rule in src/ui/styles/components.css, tests/hud-popup.test.js.
  - 2.5 seconds, a tap dismisses it at once, one at a time with the rest waiting in order (at most 5 waiting), nothing new starts while the boon picker is open (it starts about 0.2 s after the picker closes), and on the Drop screen it sits under the top HUD bar so it never covers it.
  - It counts as a tap target now (44 px min height and width, which the layout test insisted on).
- I SAW it in real Chromium (Drop screen, worst-case goals) at 320x568, 360x640, 430x932 and 1440x900: one pop-up at a time, 16 to 17 px below the HUD (no overlap), 45 px tall, a tap removed it and showed the next one, the next one lasted about 2.4 s, held while the boon picker was open (0 shown), and shown after it closed. No page errors. Screenshots taken, not committed (too big for the repo).
- The two flaky tests mentioned before were fixed by FIX-1 (see docs/notes/FIX-1.md).

STATUS: DONE
