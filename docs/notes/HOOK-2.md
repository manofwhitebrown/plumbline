# HOOK-2 notes (Wave 2 items 10, 8, 9: Mastery, Contracts, Daily Dive)

## Plan
1. Mastery (data, logic, tests, then screens)  2. Contracts  3. Daily Dive  4. Words, cheats, text-limit tests, bot check.

## Log
- Mastery logic pushed: src/data/mastery.js, src/meta/mastery.js, tests/hook2-mastery.test.js. A Part levels from grabs and chains (20/80/250/700/1600 uses). Perk: +3% Gold per level from that Part, level 5 also wins back a little Gold on a Snap. Paid when a Drop ends (no engine change). Capped at 15% of the Gold. NEXT: show it on Workshop cards and the part sheet.
- Contracts logic pushed: src/data/contracts.js (21 templates), src/meta/contracts.js, tests/hook2-contracts.test.js. 3 at a time, replaced when claimed, refreshed daily (finished ones kept). NEXT: Daily Dive logic, then all screens.
- Daily Dive logic pushed: src/data/dive.js, src/meta/dive.js, tests/hook2-dive.test.js. Fixed seed per date, today's twist switched on for the Dive only and put back, one free try (a Drop that fails to start does not use it), best Depth, streak, chest (paid once, capped). The Rewards screen must call dive.begin() then session.start(dive options). NEXT: screens (Rewards cards, Workshop and part-sheet mastery), cheats, words.
- Screens pushed: Daily Dive + Contracts cards on Rewards (src/ui/screens/diveUi.js, contractsUi.js), Mastery pips on Workshop cards and a Mastery block on both Part sheets (masteryUi.js), css src/ui/styles/hook2.css. Hooks: docs/requests/HOOK-2-to-NEW-1-hooks.md. NOT yet seen in a browser. NEXT: UI tests + text limits, cheats, WORDS.md, bot run, browser screenshots at 320x568, 360x640, 430x932.
- Pushed: screens (Dive, Contracts, Mastery pips), cheats (src/cheats/catalog-hook2.js, docs/CHEATS.md), WORDS.md section, tests/hook2-ui.test.js (text limits, old save). A cheated save may now start the Dive but earns nothing. NEXT: bot run, real-browser look at 320x568 / 360x640 / 430x932.
- Final check (Saturday 21 Nov 2026). I SAW it in a real browser (headless Chromium) at 320x568, 360x640, 430x932: Rewards (Daily Dive card, Contracts with progress bars, Daily quests) and Workshop cards with the 5 Mastery pips. No sideways scroll, no tap under 44 px, no console errors. Long contract text wraps to two lines and still fits. The Daily Dive card showed its Locked state (needs 3 Drops); the unlocked state and the Dive chest are covered by tests, not seen on screen.
- Economy: node tools/bot.js --seed 7 PASS (Mastery is paid through runhooks and capped at 15% of a Drop's Gold, so it cannot run away).
- Open ideas (not needed for DONE): a Mastery line on Results (mastery.lastBonus() exists); a real strain cut at level 5 needs src/meta/mods.js (see requests file).

STATUS: DONE
