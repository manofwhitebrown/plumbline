# HOOK-1 notes

## Done
- Wave 1 engine: boons (40, 3 rarities, tag affinity, synergies), Brace/Surge/Flare, six encounters, four guardians, relic rolls.
  Wired into the beat loop behind `createRun({ play })`. Old runs unchanged (tested). Headless auto-pick and auto-skills for simulateRun.
- New events, schema, `chooseBoon`, `useSkill`, `playView` (docs/manager/CONTRACT_ADDENDUM.md). Tests: tests/hook-play.test.js.

- Session: 'choosing' pause, `session.chooseBoon`, `session.useSkill`, `view.play`, play summary + guardian shards in the payout. Tests: tests/hook-session.test.js.
- UI (new files): boon picker with timer ring, round skill buttons with cooldown sweep, banners, guardian bar, keys 1/2/3, styles in dropPlay.css, logic tested in tests/hook-ui-model.test.js. One guarded hook in drop.js (docs/requests/HOOK-1-to-NEW-1-hook.md).

## In progress
- Real-device checks. NOT done: no browser here, so the picker, buttons and banner were not seen at 320x568 / 360x640 / 430x932 / 1440x900 with Large text and Reduce motion. CSS rules are covered by the layout tests (44 px, 12 px fonts) only.

## Next
- Wave 2 (chase HUD, relic wall, cosmetics, contracts, daily dive, mastery), Wave 3 (first-hour script, fairness extras, bot tables), cheats.
- Danger streak limit and mercy-after-3-snaps (data exists in src/data/play.js FAIRNESS, not yet applied in spawn).

## Finish session (FINISH-HOOK-1)
- PUSHED 8f5f78e: danger streak limit (no third danger in a column above 300 m; `limitStreak` in `src/engine/play/plan.js`, peek-safe, redoes the row after a boon pick), mercy after 3 snaps (`src/engine/play/mercy.js`, `snapStreak` in the `run` slice, session gives a free Brace and kinder gems). Tests: `tests/hook-fairness.test.js`. 874 tests green.
- A REAL BROWSER WORKS HERE: in a scratch folder (not the repo) run `npm i puppeteer-core @sparticuz/chromium`, then launch with `chromium.executablePath()` and `headless: 'shell'`. Run `npx vite --port 5199` detached (`setsid nohup ... &`), open `/?debug=1&fixture=busy`, wait for the Drop button (the loading screen takes a few seconds), press it. The first boon offer comes at 100 m (about 45 s).
- NEXT (in order): 1) picker and skill buttons screenshots at 320x568, 360x640, 430x932, 1440x900, plain and with Large text + Reduce motion; fix what is cut off. 2) First-hour script (`docs/design/FIRST_HOUR.md` is named in code comments but does not exist yet). 3) Cheats for the play layer in `docs/CHEATS.md` and `src/cheats`. 4) Wave 2 items 6-9 only if the wave 2 session has not pushed them (check `git log`).
- PUSHED: picker seated low on screens under 760 px tall, so the shell's Achievement banner (top layer) no longer covers the title and timer. Seen in a real browser at 320x568 plain. Still to look at: 360x640, 430x932, 1440x900, Large text, Reduce motion, skill buttons.
- PUSHED: play cheats (all boons, early first pick, free skills, force a surprise, force a guardian) in src/cheats/catalog-game.js + src/engine/play/cheats.js, docs/CHEATS.md; fixed a bug where a forced guardian was lost on step 0-1. Tests: tests/hook-cheats.test.js. NEXT: first-hour script, picker sizes, wave 2 check.
- PUSHED: first-hour script (src/data/play.js FIRST_HOUR, src/engine/play/firstHour.js, wired in session.start with mercy), docs/design/FIRST_HOUR.md, tests/hook-firsthour.test.js. NEXT: picker sizes with Large text + Reduce motion, wave 2 check.

STATUS: written by FINAL-3. The author did not leave a status line, so this is not a claim that the work was finished. Check the repo and docs/AUDIT.md for what is verified.
