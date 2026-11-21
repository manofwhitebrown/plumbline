# ONBOARD-1 notes

Job: a new player must never feel lost. Plain words, "i" tips, a guided first game, friendly empty lists, a clear PLAY.md.

- DONE: src/data/help.js (one plain line per term, 90 characters at most) and docs/onboard/TERMS.md (same lines, a test keeps them equal).
- DONE: src/ui/components/helpTip.js + src/ui/styles/helptip.css (the "i" button, 44 px tap, closes on tap, Esc or Back).
- DONE: tests/onboard-help.test.js (text limits, no developer words, tips stay on screen from 320x568 up).
- DONE: "i" tips placed (one line each in other files, owners please keep them): crew.js (Manager, Milestone, Crew on Home), modalsCollapse.js (Core Dust), rig.js (Loadouts, Suggest, Combo row), workshop.js (Workshop, Shards, friendlier empty texts), codex.js (Codex), rewards.js (Daily reward, Goals), home.js (Crew, Collapse, "What to do next" line), rewardsQuests.js (empty text), guide (new "Words to know" section, tests/ui-guide-data.test.js now expects six sections).
- DONE: src/tutorial/nextStep.js + tests/onboard-next.test.js.
- NEXT (was): put the "i" next to titles and buttons (one line each in other people's screens), tutorial steps, empty states, Home "What to do next", PLAY.md.
- DONE: tutorial now ends with two short notes, Crew and Workshop (steps crew-intro, workshop-intro in src/tutorial/steps.js). Order kept: first drop, Haul Up, Results, buy a Part, Rig, second drop, Crew, Workshop. A brand new player has no Gold, so "buy first Part" cannot come before the first drop. tests/integration-tutorial-flow.test.js updated for the new ending (one block).
- DONE: tests/onboard-tutorial.test.js (whole run start to end, every step skippable, never stuck, taps never blocked, text limits).
- DONE: docs/PLAY.md rewritten for players (tests/onboard-play.test.js). Old team-only text moved to docs/onboard/DEV_TESTING.md. Note for AI-1: .github/workflows/android.yml message points at PLAY.md "Install on Android"; that heading still exists and points to DEV_TESTING.md and ANDROID.md.
