# ONBOARD-1 notes

Job: a new player must never feel lost. Plain words, "i" tips, a guided first game, friendly empty lists, a clear PLAY.md.

- DONE: src/data/help.js (one plain line per term, 90 characters at most) and docs/onboard/TERMS.md (same lines, a test keeps them equal).
- DONE: src/ui/components/helpTip.js + src/ui/styles/helptip.css (the "i" button, 44 px tap, closes on tap, Esc or Back).
- DONE: tests/onboard-help.test.js (text limits, no developer words, tips stay on screen from 320x568 up).
- DONE: "i" tips placed (one line each in other files, owners please keep them): crew.js (Manager, Milestone, Crew on Home), modalsCollapse.js (Core Dust), rig.js (Loadouts, Suggest, Combo row), workshop.js (Workshop, Shards, friendlier empty texts), codex.js (Codex), rewards.js (Daily reward, Goals), home.js (Crew, Collapse, "What to do next" line), rewardsQuests.js (empty text), guide (new "Words to know" section, tests/ui-guide-data.test.js now expects six sections).
- DONE: src/tutorial/nextStep.js + tests/onboard-next.test.js.
- NEXT (was): put the "i" next to titles and buttons (one line each in other people's screens), tutorial steps, empty states, Home "What to do next", PLAY.md.
