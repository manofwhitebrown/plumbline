# Notes from NEW-5 (integrator: wiring, build, deploy)

STATUS: DONE

## Done
- Resolved all 19 files in docs/requests/ (one line each below). The folder now only has its README.
- Engine and parts now work together (see "Big fix"). Starter rig pays about 49 gold when hauled at 80% strain, median depth 76 m.
- `main.js`: `session.recover()` at boot, one audio wiring (`wireAudio`, `initOnFirstGesture`), debug entry points, fixtures.
- `src/cheats/fixtures.js`: `loadFixture('empty'|'busy'|'extreme')`. Memory only. It refuses to run on real storage.
- `session.debugView({extreme})` and `session.debugResults(outcome, {extreme})`: fake data, no events, no pay.
- `src/ui/flow.js`: `startDrop()` starts the session itself (with the tutorial's first-drop options) and then opens the Drop screen.
- Tests: `tests/integration-flow-real.test.js` (real engine + meta + run + save, 14 tests).

## Big fix: the engine did not pay anything for real parts
The parts (AI-3) act through `parts/runtime.js` and only set `item.collected`. The engine (AI-2) used its own pipeline and
never read that, so a Hook fired but paid 0 gold. `engine/beat.js` now calls `beginBeat`, `processLane`, `finishBeat` and pays from
`fx.collected / missed / hazards` (`settleParts`). Parts given through `deps.getPart` (the engine tests' fakes) still use the old pipeline.
Also done in the engine: `safeUntilDepth`, the daily twist (`applyTwist` in `createRun`), and `gemRate / oreRate / hazardRate / rareMult` in `spawn.js`.

## Request log (each file was deleted in the same commit)
- AI-1-to-AI-7-soft-imports: done. `ui/soft.js` uses plain imports for core and audio; the rest comes from `ui/boot.js` (eager glob).
- AI-1-to-ALL-init-hook: done. `run` and `tutorial` now export `init()`. `meta` already had it. `main.js` calls them in order.
- AI-2-to-AI-3-part-hooks: not needed as written. The engine uses AI-3's `parts/runtime.js` instead (see Big fix). `registry.js` already imports `getPart`.
- AI-2-to-AI-4-biome-notes: info only. Bats already drift at spawn.
- AI-2-to-Manager-visual-polish: kept below under "Polish ideas".
- AI-3-to-AI-2-parts-runtime: done (Big fix).
- AI-3-to-AI-4-AI-5-mods-fields: done for rates and `rareMult` (in `spawn.js`) and the daily twist (in `createRun`). `multiplierLevel` has no Workshop upgrade yet, so it stays at the default 1.
- AI-3-to-Manager-part-count: 26 parts is right. CONTRACT section 6 still says 24. The Manager can fix that line.
- AI-4-to-AI-1-boot-recover: done (`recover` boot step in `main.js`).
- AI-4-to-AI-2-engine-hooks: done. `simulateRun` returns `kept` and `gold`; `detectCombos` comes from `engine/parts/combos.js`.
- AI-5-to-AI-4-pay-and-rig: done. Exactly one payment (`run/finish.js`; test proves it for haul, snap and recovery). `rig` is in `run:started` and `run:ended`. Auto-Haul in `session.js`. Rig is re-checked on `meta:collapsed`.
- AI-7-to-AI-1-mount-ui: done in `main.js`.
- AI-7-to-AI-6-partIcon-dataurl: done. `toDataURL` uses a normal canvas first.
- AI-8-to-AI-1-audio-wiring: done. `wireAudio()` and `initOnFirstGesture()` in `main.js`. `core/wiring.js` no longer calls `audio.onEvents` (it would double the sound).
- AI-8-to-AI-2-tutorial-safe-depth: done (`safeUntilDepth`).
- AI-8-to-AI-4-tutorial-run-options: done (`seed`, `safeUntilDepth`, `tutorial` in `session.start`; `rig:changed` already sent).
- AI-8-to-AI-5-tutorial-meta-event: already done (`workshop.js` emits `meta:changed {what:'parts'}`).
- AI-8-to-AI-7-tutorial-hooks: partly done. See "Still needed from the screens".

- NEW-6-to-Manager-engine-parts-wiring: done (Big fix). One difference: `createRun` still applies each part's `passive` once per kind (AI-2's rule), not once per cell like `applyPassives`.
- NEW-8-to-NEW-1-format-limits: done. `fmt` uses one decimal for a 3-digit exponent; `fmtDepth` prints `100K m` from 100000. The two todo tests are now real tests.
- NEW-6-to-ALL-plain-words: not mine (data text owned by others). Left in docs/requests/ for the data owners.

## Screens
Drop, Results, Workshop, Crew, Codex, Rewards, Settings and Guide are now real on main. They must not call `session.start` (`ui/flow.js` does).
Open points for the screen owners: `audio.setScreen(id)` is not called by the shell yet; check `data-tut` marks `well`, `strain`, `haul`, `results-gold`, `workshop-part` exist on Drop, Results and Workshop.

## Polish ideas (from AI-2, for the renderer and UI owners)
- Blend the biome gradient into the next over the last 15 m before a BIOME event. Vignette darker with depth. Strain gauge: smooth green, amber, red.
- COLLECT: pop and floating gold number (size and pitch grow with combo). CHAIN: a bright line that fades in about 160 ms. HAZARD absorbed: ring flash on that cell; not absorbed: rope shake.
- MILESTONE: light band sweeps. SNAP: freeze 80 ms, then crack flash. Use `alpha` to slide items between beats.
- One line weight and rounded ends on all part icons; a soft gradient per family. HAUL UP pulses faster as `beatsToSnap` falls. Ghost rows from `peekNext` when a Lantern is in the rig.

## Deploy (checked with the GitHub API on commit c11bef6)
ci.yml, pages.yml and android.yml are green on main. Pages is deployed at https://manofwhitebrown.github.io/plumbline/. The APK artifact `plumbline-debug-apk` (about 7.5 MB) exists. Old Pages runs show "cancelled" only because newer pushes replace them (`cancel-in-progress`).

## Not checked
- I had no real browser here. The journey is covered by tests with the real modules (`tests/integration-flow-real.test.js`), not by clicking the real page. Install the APK on a phone and play one session to confirm.
- Left for others: docs/requests/ still holds files for other owners.
