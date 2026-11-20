> **PUSH OFTEN: you can be cut off at any time. Commit and push after every small working piece (pull --rebase, npm run check, push). Details: docs/manager/PUSH_OFTEN.md**

# CONTRACT (shared by all AIs — follow exactly)

AI-1 commits this section verbatim as `docs/CONTRACT.md` in the first commit. Only the Manager edits it afterwards.

## 1. Tech and commands

- Node 22+, Vite, vanilla JavaScript ES modules, Canvas 2D for the well, DOM + CSS for menus and HUD, Capacitor for Android.
- `npm run dev` (browser, hot reload) · `npm test` (node:test) · `npm run build` (dist/) · `npm run check` (= test + build + `tools/check-secrets.js`).
- Vite `base: './'` so it works on GitHub Pages and inside the APK.
- Portrait is the primary layout. On wide screens the game shows as a centered column (max 480 px wide, full height) over a soft atmospheric backdrop.

## 2. Folder ownership

| Owner | Files and folders |
|---|---|
| AI-1 | `package.json`, `vite.config.js`, `index.html`, `capacitor.config.json`, `.github/`, `android/`, `public/`, `src/main.js`, `src/core/`, `src/platform/`, `tools/check-secrets.js`, `README.md`, `.gitignore`, `docs/CONTRACT.md`, `docs/ARCHITECTURE.md`, `docs/ANDROID.md`, `docs/PLAY.md` |
| AI-2 | `src/engine/*.js` (not `parts/`, not `twists.js`), `src/data/engine.js`, `tests/engine-*` |
| AI-3 | `src/engine/parts/`, `src/engine/twists.js`, `src/data/parts.js`, `src/data/twists.js`, `docs/PARTS.md`, `tests/parts-*` |
| AI-4 | `src/run/`, `src/data/biomes.js`, `src/data/loot.js`, `src/data/goals.js`, `tests/run-*` |
| AI-5 | `src/meta/`, `src/cheats/`, `docs/CHEATS.md`, `src/data/crew.js`, `src/data/upgrades.js`, `src/data/rewards.js`, `tests/meta-*`, `tests/cheats-*` |
| AI-6 | `src/render/`, `dev/`, `tests/render-*` |
| AI-7 | `src/ui/` (shell, components, screens, styles), `tests/ui-*` |
| AI-8 | `src/audio/`, `src/tutorial/` (includes `suggest.js`), `tools/bot.js`, `tools/balance-report.js`, `tests/integration-*`, `docs/WORDS.md`, `docs/QA.md` |
| Manager | `docs/manager/` (read-only for AIs), later edits to this contract |
| Each AI | `docs/notes/AI-N.md`, `docs/requests/AI-N-to-AI-M-*.md` |

## 3. Core API (AI-1) — `src/core/`

- `bus.js`: `bus.on(name, fn) -> off()`, `bus.emit(name, payload)`. Handler errors are caught and logged, never thrown to the emitter.
- `rng.js`: `makeRng(seed) -> { next(), int(a,b), pick(arr), chance(p), weighted([[value,weight],...]) }` (mulberry32, deterministic).
- `save.js`: `registerSlice(name, { version, defaults, migrate(old, fromVersion) })`, `getSlice(name)` (same object each call), `markDirty(name)`, `saveNow()`, `resetAll()`, `exportSave() -> string`, `importSave(string) -> {ok, error?}`. Autosave every 10 s when dirty and on `pagehide`/`visibilitychange`. Versioned envelope `{ v, slices }`. Unreadable data is kept under `<key>.corrupt` and defaults are used. Works with localStorage unavailable (memory fallback).
- `loop.js`: `createLoop({ beatMs, onBeat, onFrame }) -> { start(), stop(), pause(), resume(), setBeatMs(ms), isRunning() }`. Fixed-step accumulator for beats; `onFrame(dtMs, alpha)` every animation frame (`alpha` = progress to next beat, 0..1). Clamps dt to 250 ms. Auto-pauses when the tab is hidden.
- `format.js`: `fmt(n)` (1.2K, 3.4M … up to Dc, then 1e40 style; never prints NaN/Infinity), `fmtTime(ms)` ("2h 05m"), `fmtDepth(m)` ("412 m"), `fmtPct(x)`.
- `log.js`: `log.warn(...)`, `log.error(...)`, `log.recent()` (ring buffer of 200).
- `clock.js`: `now()`, `elapsedSince(ts, capMs)` (never negative, never above `capMs`).
- `src/platform/`: `haptics.js` `buzz('tap'|'collect'|'warn'|'snap'|'record')` (no-op when unsupported or disabled), `viewport.js` (safe-area helpers, `isLandscapeWide()`).

## 4. Data shapes (everyone)

```js
// A thing that rises past the bucket in one lane
Item = { kind: 'gem'|'ore'|'hazard'|'relic'|'empty', tier: 1..6, hazard?: 'rock'|'bat'|'root'|'steam'|'void', value: number }

// The rig on the bucket. Row 0 = top. LAST row = bottom (it touches the stream first).
Rig = { cols: 4|5, rows: 3|4, cells: (string|null)[][] }   // cells[row][col] = partId or null

// Mods: everything permanent that changes a run. Built by meta.getMods(). The engine ONLY reads this object.
Mods = {
  maxStrain: 100,            // base 100 (+ upgrades)
  keepOnSnap: 0.30,          // fraction of gold kept after a snap (max 0.60)
  goldMult: 1,               // total multiplier on gold
  strainMult: 1,             // multiplies strain per beat (lower is better)
  luck: 0,                   // 0..1, shifts spawn tables toward higher tiers
  startDepth: 0,             // metres skipped at start (earned through upgrades)
  cols: 4, rows: 3,          // rig size (grows with upgrades up to 5x4)
  unlockedParts: ['hook'],   // part ids the player owns
  twist: null,               // optional daily twist id
  cheat: null                // null normally. Only the cheat menu sets it: { noSnap, freezeStrain, speedMult, forceBiome, goldMult }
}
```

## 5. Engine API (AI-2) — `src/engine/`

The engine is pure logic: no DOM, no canvas, no timers, no `Math.random`. Same seed + rig + mods = identical run.

```js
createRun({ rig, mods, seed }) -> Run
stepBeat(run) -> Event[]            // advance exactly one beat
haul(run) -> Event[]                // player pressed HAUL UP (status -> 'hauled')
peekNext(run, n) -> Item[][]        // next n beats of lane items (used by Lantern and the hint UI)
riskInfo(run) -> { beatsToSnap, goldAtRisk, keepIfSnap }
run.state = { status:'running'|'hauled'|'snapped', beat, depth, speed, gold, strain, maxStrain, combo, biomeId, stats:{...} }
simulateRun({ rig, mods, seed, policy }) -> Result   // headless; policy({run,riskInfo}) -> 'continue'|'haul'
```

**One beat** (base 450 ms; Drill/Anchor change speed in metres per beat, base 1 m):
1. `depth += speed`.
2. Spawn one row of `cols` Items (seeded, from `data/biomes.js` tables).
3. For each lane left→right, its item travels the column from the BOTTOM row to the TOP row. Each part there may act on it (collect, change, split, absorb).
4. Items nobody collected: gems/ore → `MISS`; hazards → hit the rope (strain up) unless absorbed.
5. `strain += strainPerBeat(depth) * mods.strainMult + hazardStrain − reductions`, clamped to ≥ 0.
6. `strain >= maxStrain` → `SNAP`.
7. Gold per collected item = `item.value × comboMult × mods.goldMult × depthBonus(depth)`. Base tier values 1, 3, 9, 27, 81, 243 (times the biome factor).
8. `strainPerBeat(depth) = 0.35 + 0.0016 × depth` as the starting formula (a bare rope snaps near 200 m). AI-2 may tune within the balance targets below.

**Events** (plain objects, `{ t:'NAME', ... }`; this list is the only language between engine, renderer, audio and UI):

```
RUN_START {seed}                 BEAT {i, depth, speed}            SPAWN {i, lanes: Item[]}
FIRE {r, c, partId}              CHAIN {from:{r,c}, to:{r,c}}      COLLECT {lane, item, gold, combo, r, c}
MISS {lane, item}                HAZARD {lane, hazard, absorbedBy:{r,c}|null, strainDelta}
STRAIN {value, max, delta}       BIOME {id, depth}                 MILESTONE {depth}   // every 50 m
SNAP {goldLost, goldKept}        HAUL {gold, depth}                RECORD {depth}
```

## 6. Parts (AI-3) — `src/engine/parts/`, `src/data/parts.js`

```js
PartDef = { id, name, family: 'collector'|'processor'|'defense'|'engine'|'special', tags: string[],
  desc, cost, unlock: {type:'start'|'gold'|'depth'|'codex', value},
  onBeat?(ctx), onItem?(ctx, item) -> item|null, onHazard?(ctx, hazard) -> boolean /*absorbed*/, passive?(mods) -> mods }
ctx = { run, r, c, lane, rng, emit(event), neighbor(dr, dc) -> {partId,r,c}|null }
getPart(id) -> PartDef | null      allParts() -> PartDef[]      // unknown id returns null and is ignored
```

The 24 launch parts (AI-3 tunes numbers, may add flavour, may not remove or rename):

| Family | Parts |
|---|---|
| Collector | **Hook** (starter; collects the item in its lane), **Magnet** (ore in its lane and both neighbour lanes), **Net** (gems in own lane and the lane to its right, 75% on the neighbour), **Vacuum** (collects every non-hazard in its lane, +1 strain per beat) |
| Processor | **Polisher** (gem tier +1), **Multiplier** (×2 value, later ×3 variant), **Smelter** (ore becomes tier-1 gem), **Splitter** (copies the item into both neighbour lanes at 50%), **Amplifier** (+25% for each part already fired this beat), **Gilder** (every 5th item doubles), **Prism** (tier 3+ gem gives a Shimmer ×2 when an adjacent Prism also fires this beat) |
| Defense | **Plate** (absorbs the first hazard in its lane every 5 beats), **Shield** (absorbs hazards in a 3×3 area, 3 charges per run), **Oil Can** (strain −0.5 per beat), **Cooler** (strain −2 when a gem is collected in its column), **Spike Guard** (hazards in its lane become ore), **Spare Rope** (+20 max strain, only one counts) |
| Engine | **Drill** (+1 m per beat, +strain), **Anchor** (−0.3 m per beat, −strain), **Metronome** (every 4th beat fires every processor in its row twice), **Battery** (stores a charge per collect; at 10 charges doubles the next collect) |
| Special | **Lantern** (reveals the next 2 beats of its lane, +10% relic chance), **Compass** (rare item chance ×2), **Jackpot Chest** (collects relics), **Echo** (repeats the last collected value at 50%), **Fuse** (on a hazard hit it blows up neighbour hazards for a gold bonus) |

Twists (`src/engine/twists.js`): daily rule modifiers expressed as Mods overlays, e.g. `brittle_rope` (−30 max strain, +40% gold), `gem_rain` (luck +0.3), `hazard_fest` (more hazards, hazard kills pay gold).

## 7. Run session and rig (AI-4) — `src/run/`

```js
session.start({ rig? }) ; session.haul() ; session.pause() ; session.resume() ; session.abort()
session.getView() -> { status, depth, gold, strain, maxStrain, biomeId, combo, risk:{beatsToSnap, goldAtRisk, keepIfSnap}, goals:[...] }
// bus events: 'run:started' {view}, 'run:events' {events, view} (once per beat), 'run:ended' {outcome:'hauled'|'snapped', gold, kept, depth, bestBefore, newRecord, shardsEarned, goals, partsUsed}
rigs.getRig() ; rigs.place(r,c,partId) -> {ok, error?} ; rigs.remove(r,c) ; rigs.swap(a,b) ; rigs.clear() ; rigs.loadouts.save(slot) ; rigs.loadouts.load(slot) ; rigs.validate(rig, mods)
biomes.byDepth(depth) -> BiomeDef ; loot.table(biomeId, luck) -> weighted spawn table
```

Biomes (each also defines hazards, tier odds, gold factor, palette keys):

| Id | Depth | Look | Hazards |
|---|---|---|---|
| `clay` | 0–100 | warm brown | rock |
| `quartz` | 100–250 | cold blue | rock, bat |
| `amber` | 250–450 | honey orange | bat, root |
| `magma` | 450–700 | deep red | root, steam |
| `void` | 700–1000 | violet black | steam, void |
| `abyss` | 1000+ | endless, scales | all |

Each drop shows 3 optional **goals** (e.g. "Reach 150 m", "Collect 20 gems", "Haul with strain under 40") that pay shards.

## 8. Meta (AI-5) — `src/meta/`, `src/cheats/`

```js
meta.getMods() -> Mods ; meta.gold() ; meta.shards() ; meta.coreDust()
meta.addGold(n) ; meta.spendGold(n) -> bool ; meta.addShards(n) ; meta.spendShards(n) -> bool
meta.ownedParts() ; meta.canBuyPart(id) ; meta.buyPart(id) -> {ok, error?}
meta.crew.list() ; meta.crew.buy(id) ; meta.crew.perSecond() ; meta.offline.peek() -> {ms, gold}|null ; meta.offline.claim()
meta.collapse.available() ; meta.collapse.preview() -> {coreDustGain} ; meta.collapse.do()
meta.upgrades.list() ; meta.upgrades.buy(id)
meta.daily.state() ; meta.daily.claim() ; meta.quests.list() ; meta.achievements.list()
meta.codex.list() ; meta.codex.record(entryId)
meta.stats.get() ; meta.tick(dtMs)
// bus: 'meta:changed' {what}, 'achievement:unlocked' {id}, 'codex:new' {id}
```

Idle crew (surface): Winch Hand, Smithy, Cart Line, Lamp Hall, Assay Office, Deep Foundry (each costs `base × 1.15^owned`, 10/25/50/100 milestones double output). Offline income cap 8 h at 60% efficiency. Collapse unlocks at best depth ≥ 500 m and lifetime gold ≥ 1M; resets gold, crew and parts but grants Core Dust (permanent +10% gold each, spendable on permanent upgrades). Daily reward is a 7-day streak (a missed day resets). Cheats are hidden and password-locked (see AI-5 mission; only a hash is ever stored). Using a cheat marks the save as cheated: no records, no achievements. The engine honours `mods.cheat` only when it is not null.

## 9. Renderer (AI-6) — `src/render/`

```js
createRenderer(canvas, { reduceMotion, quality }) -> {
  resize(w, h, dpr), setRun(runView, rig), pushEvents(events), frame(dtMs, alpha), setQuality('high'|'low'), destroy()
}
partIcon.draw(ctx, partId, x, y, size, state)   partIcon.toDataURL(partId, size)   // for DOM use by AI-7
```

## 10. UI shell (AI-7) — `src/ui/`

```js
shell.registerScreen(id, { mount(el, params), unmount() }) ; shell.go(id, params) ; shell.toast(text, kind) ; shell.modal(spec)
// screen ids: home, rig, drop, results, crew, workshop, codex, rewards, settings, guide
```

## 11. Audio and tutorial (AI-8) — `src/audio/`, `src/tutorial/`

```js
audio.init() (call on first user gesture) ; audio.onEvents(events, view) ; audio.setBiome(id) ; audio.setStrain(value01)
audio.ui('tap'|'buy'|'deny'|'open'|'close'|'claim') ; audio.mute(bool) ; audio.setVolumes({sfx, music})
tutorial.start() ; tutorial.isActive() ; tutorial.skip()
suggest.bestRig(mods, ownedParts) -> Rig   // used by the "Suggest" button on the rig screen
```

All sound is generated in code (WebAudio). Gem collects play notes of a pentatonic scale; the pitch climbs with the combo count so a good chain sounds like a melody.

## 12. Balance targets (AI-2, AI-3, AI-4, AI-5, AI-8 share these)

- First drop with the starter rig (1 Hook, 4×3 grid, no upgrades): ends between 60 and 120 m (a snap or a haul) and pays 40–150 gold.
- A new part unlocks within the first 2 drops; the first biome change (100 m) happens within the first 3 drops.
- A normal drop lasts 45–90 s. The player has a real decision about Haul Up in the last 25% of strain.
- Collapse becomes available after about 2–3 hours of play. Core Dust per Collapse feels worth it at about 15–25% more power.
- Bot rig search (`tools/balance-report.js`): at least 5 different rig archetypes within 15% of the best average gold at the same progress. No single part appears in more than 60% of top rigs.
- Zero NaN/Infinity/negative values across 100,000 simulated runs.

## 13. Visual design spec (AI-6 and AI-7 own it; everyone respects it)

**Mood:** a deep, warm, mysterious well. Dark ink backgrounds, glowing gems, brass and gold accents. Premium, calm, rich — not cartoonish, not cluttered.

**Tokens (`src/ui/styles/tokens.css`, mirrored in `src/render/palette.js`):**
`--ink-900 #070a12` · `--ink-800 #0d1220` · `--ink-700 #141b2e` · `--ink-600 #1d2740` · `--line #2a3555` · `--text #eef2ff` · `--muted #8d97b8` · `--gold #f6c453` · `--gold-soft #ffe3a1` · `--ember #ff7a45` · `--ok #46e3a3` · `--danger #ff4d5e` · `--shard #7fd6ff` · `--core #b583ff`.
Gem tiers: t1 quartz `#9fb4ff` · t2 emerald `#46e3a3` · t3 amber `#ffb454` · t4 ruby `#ff5470` · t5 void-violet `#b583ff` · t6 prism (animated rainbow).
Biome gradients (top→bottom): clay `#3a2a22→#1b1410` · quartz `#1c2a4a→#0b1020` · amber `#4a3213→#1a1006` · magma `#4a1a14→#14070a` · void `#1a0f33→#05030d`.

**Type and shape:** system UI font stack, bold tabular numbers for all counters. Scale 12 / 14 / 16 / 20 / 28 / 40. Spacing grid 4 px (use 8, 12, 16, 24). Radius 16 for cards, 12 for buttons, 999 for pills. Soft glow (not hard shadows). Minimum tap target 44×44 px. Motion 160–260 ms ease-out; every animation respects "Reduce motion".

**Icons:** all vector, drawn in code (SVG for UI, canvas for parts). No downloaded images, no emoji as icons.

## 14. Screens and layout (AI-7 builds, others integrate)

- **Bottom tab bar** (Home, Rig, Crew, Workshop, Codex, More) on menu screens; hidden during a drop. Respect `env(safe-area-inset-*)`.
- **Home:** top bar (gold, shards, settings), a living surface scene (small canvas or CSS, crew silhouettes, lantern flicker), best depth, big **DROP** button in the thumb zone, offline "Welcome back" modal when relevant, daily reward badge.
- **Rig:** the bucket grid large in the middle; below it a scrollable parts tray (icon, name, cost/owned); tap a part then tap a cell to place; tap a placed part to see its info card with Sell/Move; a **Suggest** button; 3 loadout slots; a live "rig power" preview line. Drag and drop also works.
- **Drop (HUD over the canvas):** top: depth (large), gold, biome name; left edge: slim strain gauge that turns amber then red; bottom: the big **HAUL UP** button (min height 64 px, full width minus margins) with a small line "Keep all · at risk: 1.2K"; combo counter near the bucket; pause in a corner. When strain is above 75% the screen edges pulse red and the button pulses gold.
- **Results:** a celebratory count-up of gold, depth with a new-record flair, goals checked off, parts-used summary, big buttons **Drop again** and **Home**. A snap shows what was kept vs lost.
- **Crew, Workshop, Codex, Rewards, Settings, Guide:** consistent card lists, clear Buy buttons with disabled states, progress bars toward the next milestone on everything.
- **Hidden cheats:** nothing about cheats is visible by default. In Settings, tapping the build label ("Plumbline v0.1 · build abc123") 7 times reveals a small password box. Right password opens the cheat panel.
- **Laptop (≥ 900 px wide):** centered game column (max 480 px), atmospheric backdrop, keyboard: Space = Drop/Haul Up, R = Rig, Esc = back/pause.
- **Glossary (only these words on screen):** Gold, Shards, Core Dust, Rig, Part, Drop, Haul Up, Snap, Strain, Depth, Biome, Crew, Workshop, Collapse, Codex, Goals, Combo, Loadout. Internal words ("beat", "lane", "tick") are never shown to players.

## 15. Save slices (names reserved)

`meta` (AI-5), `rig` (AI-4), `run` (AI-4, best depth and stats), `settings` (AI-7), `tutorial` (AI-8), `codex` (AI-5). Each module registers its own slice and handles its own migrations.
