# HOOK-1 WIRING PLAN (Manager, from reading the code at commit 3183196)

HOOK-1 pushed data and the play modules (`src/engine/play/*`, `src/data/{abilities,boons,bosses,events,play,relics}.js`). They are NOT wired into the engine yet: `run.play` is never created, `beat.js` never calls them, and there is no `createPlay`. This is the shortest path. Do the steps in order; each ends with a green `npm run check`.

## Step 1: the play object
- `src/engine/play/index.js`: `createPlay(run, opts)` returns `run.play` (call it `P`). It must have what the modules already read: `P.fx` (`emptyFx()`), `P.picked` (boon ids), `P.abil` (via `initAbilities`), `P.braceLeft`, `P.surgeLeft`, `P.stats = { uses:{}, enc:{}, surgeStrain:0, ... }`, `P.enc` and `P.encRules` (`initEncounters`), guardian state (`initGuardians`), `P.plan = {}`, `P.clear = {}`, `P.noClear = {}`, `P.cover`, and `P.recompute(run, force)`.
- `P.recompute` turns `P.fx` and the surge state into the run's numbers: gold multiplier (x `P.fx.gold`, x2 while `P.surgeLeft > 0`), strain multiplier (`P.fx.strain`), speed (`P.fx.speed`, x `slowMult` while `P.braceLeft > 0`), luck, `keepOnSnap` (+ `P.fx.keep`), `maxStrain` (+ `P.fx.maxStrain` as a fraction), `second` (Second Wind), `ward`, wide grip. Keep results finite and clamped (use `CAPS` in `data/boons.js`).
- `createRun({..., play})`: when `play` is missing or false, `run.play = null` and NOTHING changes. Add a test with a golden hash of the event log for 200 seeds that proves old callers are byte-identical.

## Step 2: engine hooks (all guarded by `if (run.play)`)
- `beat.js` start of step: `tickAbilities(run, out)`, `tickEncounters(run, out)`, `tickGuardian(run, out)`; apply speed and gold from `recompute`.
- `spawn.js` `spawnRow`: call `applyPlan(run, beat, row)` after the normal row is made (and make `peekRows` see the same plan, so Flare and `peekNext` agree).
- Parts runtime: `onMarkGrabbed`, `onGuardianGrab`, `onEncounterHazardHit` where items are collected or hazards hit.
- Snap: Second Wind (`fx.second`) and `noJump` (see `FAIRNESS` in `data/play.js`) before `SNAP`.
- Boon offers: at each offer depth set `st.status = 'choosing'` and emit `BOON_OFFER`; `stepBeat` returns `[]` while choosing. `run.chooseBoon(id)` calls `resolveOffer`; `autoPickId` is the timeout and the headless policy.
- New events go through `src/engine/events.js` (constructors and the validator) and are written in `docs/manager/CONTRACT_ADDENDUM.md`. Renderer, audio and UI already ignore unknown events: confirm with a test.

## Step 3: session and view (`src/run/`)
- `session.useAbility(id)`, `session.chooseBoon(id)`, a boon-pick timer (6 s, auto-pick middle), pause while choosing, `view.abilities`, `view.offer`, `view.encounter`, `view.guardian`, `view.boons`. Keep every existing `getView()` field.
- `simulateRun` and `tools/bot.js`: pick boons with `autoPickId`, use Brace when strain is above 70 percent, Surge when strain is below 40 percent.

## Step 4: UI (new files only; hooks in `drop.js` kept tiny)
- `src/ui/screens/dropAbilities.js`: round buttons above HAUL UP with a cooldown sweep, keys 1/2/3, never covering HAUL UP or the lanes.
- `src/ui/screens/boonPick.js`: 3 cards, rarity glow, tag chips, timer ring, fits 320x568.
- Encounter banner (3 steps of warning) and a guardian health bar. All text from `src/data`, glossary words only.

## Step 5: tune and cheat
- Extend the bot, run `tools/balance-report.js`, meet the targets in HOOK-1's prompt (a decision every 10 to 15 s, no boon over 35 percent pick rate, Collapse still 2 to 3 h).
- Cheats: force an encounter, spawn a guardian, give all boons: add to `src/cheats` catalog.

Stop after Step 3 if usage is low and write what is next in `docs/notes/HOOK-1.md`.
