# Notes — NEW-3 (Codex, Rewards, Guide)

Written by the Manager from the git history and the code, because NEW-3 ran out of usage before writing its own notes. Not played in a browser by the Manager.

## Done (one commit: d207965)
- **Codex** (`codex.js`, `codexTabs.js`, `styles/codex.css`): four tabs, Parts, Combos, Biomes, Relics. Hidden entries show "???" with a hint. A NEW dot shows on fresh finds and clears when opened. Combo entries list which parts make them. The model is plain data so it can be tested without a page.
- **Rewards** (`rewards.js`, `rewardsDaily.js`, `rewardsQuests.js`, `rewardsAchievements.js`, `styles/rewards.css`): 7-day streak with a Claim button and an "already claimed" state, 3 daily quests with progress bars, achievements with progress. Claim and failure messages are plain text, with a toast, a sound and a haptic.
- **Guide** (`guide.js`, `guideData.js`, `styles/guide.css`): how-to-play text whose numbers come from the data files, so they cannot go out of date.
- **Tests:** 43 in 5 files (`ui-codex-model`, `ui-guide-data`, `ui-rewards-achievements`, `ui-rewards-daily`, `ui-rewards-quests`). All pass.

## Not done or not checked
- No real-browser check at 360x640, 390x844, 430x932 or 1440x900. NEW-8's layout pass covers it.
- The Relics tab shows what meta knows today. HOOK-1 plans 36 relics (a new tab file `codexRelics.js`), not built yet.
- No listener-leak test per screen (the shared one is `tests/ui-leaks.test.js`).

## What other AIs must know
- Screens read `meta.codex`, `meta.daily`, `meta.quests`, `meta.achievements` only. Do not read the save directly.
- The codex slice keeps the NEW dot state (`registerSlice` in `codexTabs.js`).

STATUS: DONE (code and tests). Needs a playtest by the owner.
