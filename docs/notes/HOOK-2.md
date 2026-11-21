# HOOK-2 notes (Wave 2 items 10, 8, 9: Mastery, Contracts, Daily Dive)

## Plan
1. Mastery (data, logic, tests, then screens)  2. Contracts  3. Daily Dive  4. Words, cheats, text-limit tests, bot check.

## Log
- Mastery logic pushed: src/data/mastery.js, src/meta/mastery.js, tests/hook2-mastery.test.js. A Part levels from grabs and chains (20/80/250/700/1600 uses). Perk: +3% Gold per level from that Part, level 5 also wins back a little Gold on a Snap. Paid when a Drop ends (no engine change). Capped at 15% of the Gold. NEXT: show it on Workshop cards and the part sheet.
- Contracts logic pushed: src/data/contracts.js (21 templates), src/meta/contracts.js, tests/hook2-contracts.test.js. 3 at a time, replaced when claimed, refreshed daily (finished ones kept). NEXT: Daily Dive logic, then all screens.
- Daily Dive logic pushed: src/data/dive.js, src/meta/dive.js, tests/hook2-dive.test.js. Fixed seed per date, today's twist switched on for the Dive only and put back, one free try (a Drop that fails to start does not use it), best Depth, streak, chest (paid once, capped). The Rewards screen must call dive.begin() then session.start(dive options). NEXT: screens (Rewards cards, Workshop and part-sheet mastery), cheats, words.
