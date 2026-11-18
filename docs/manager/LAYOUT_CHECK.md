# LAYOUT CHECK — every screen must fit perfectly on every device

From: Manager. To: AI-1 to AI-8. Read this whole file, then do your part. This is a **shared job**: nobody waits for one AI. Each of you checks a set of screens, fixes what you can, and double-checks a neighbour's work.

Goal: no cut-off text, no overlap, no sideways scroll, no hidden buttons, no tiny tap targets, on every size below. Zero console errors.

## 1. Sizes to test (CSS pixels)

| Group | Sizes |
|---|---|
| Small phones | 320×568, 360×640, 375×667 |
| Normal phones | 360×780, 390×844, 412×915, 430×932 |
| Tablet | 768×1024 |
| Phone sideways | 844×390 (the game must stay a clean column, never stretched) |
| Laptop | 1024×768, 1440×900, 1920×1080 |

Also test these twists on at least 360×640, 390×844 and 1440×900:
1. **Large text** setting ON.
2. **Browser zoom** 125% and 150% (laptop) and Android text size 130% (simulate with Large text plus zoom).
3. **Notch / home bar:** pretend safe areas of top 44 px and bottom 34 px (use the debug frame helper in section 3).
4. **Rotate** while on the screen (portrait to sideways and back): nothing may break or lose state.
5. **Reduce motion** ON.

## 2. What counts as a failure (fix all of these)

1. Sideways scroll anywhere (`scrollWidth > clientWidth`).
2. Text cut off, overlapping other text, or running outside its card. Long text must wrap or end with "…".
3. A button, tab or number hidden behind the tab bar, the notch, the home bar or the on-screen keyboard.
4. Any tap target smaller than 44×44 px, or two tap targets closer than 8 px.
5. Text smaller than 12 px (14 px for body text).
6. A screen that should not scroll (the Drop screen) scrolling, or a screen that should scroll (lists) where the last item cannot be reached.
7. A modal or bottom sheet taller than the screen without its own scroll, or a close button that is off screen.
8. Blurry canvas (wrong pixel density), stretched or squashed canvas, bucket or items clipped by the HUD.
9. Layout jump (things moving) when numbers change, a counter grows, or a toast appears.
10. A wide laptop window that shows the game full width instead of the centered column.
11. Anything unreadable: contrast too low, text on a busy background without a backing.
12. Any console error or warning while moving through the screens.

## 3. Shared tools (some AIs build them, everybody uses them)

- **Test states.** AI-5 adds `src/cheats/fixtures.js` with `loadFixture('empty' | 'busy' | 'extreme')` that fills the **in-memory** save only (never the real saved game): `empty` = brand new; `busy` = mid game, 12 parts, some upgrades; `extreme` = 26 parts, 5×4 bucket, 999.9Dc gold, depth 99999 m, 99 combo, longest names, every list full, daily and quests mid-way. AI-1 wires the URL `?debug=1&fixture=extreme` to call it at boot.
- **Jump to a screen.** AI-1 wires `?debug=1&screen=<id>` (home, rig, drop, results, crew, workshop, codex, rewards, settings, guide) so you can open any screen directly. For `drop` and `results` it starts a safe fake drop or shows fake results (AI-4 supplies `session.debugView()` and `session.debugResults()` for this).
- **Device wall.** AI-6 builds `dev/layout-wall.html`: shows the game in iframes at every size in section 1 side by side (pick the screen, pick the fixture, toggle Large text, simulate notch with CSS variables `--sat` and `--sab`, toggle rotate). Open with `npm run dev` then `/dev/layout-wall.html`.
- **Static CSS check.** AI-8 builds `tests/integration-layout-css.test.js` that reads all CSS and fails on: `100vh` for full-height layouts (use `100dvh` with a fallback), fixed pixel widths above 360 px on mobile rules, `position: fixed` bars without safe-area padding, tap targets below 44 px (`min-height` / `min-width` on buttons), font sizes below 12 px, `overflow-x` missing on wide content (tables, code, long rows), `white-space: nowrap` without an ellipsis rule.
- **Text limit tests.** Each data owner adds a test that all player text fits the limits below (so long names can never overflow).

| Text | Max length |
|---|---|
| Part name | 14 characters |
| Part description | 90 characters |
| Combo name | 20 characters |
| Biome name | 12 characters |
| Goal text | 28 characters |
| Crew, upgrade, achievement, quest name | 22 characters |
| Their descriptions | 80 characters |
| Toast and warning lines | 60 characters |
| Any formatted number (`fmt`) | 8 characters |

If a real name is longer, shorten the name. Do not make the layout bigger.

## 4. The rule that lets everyone work at once

Normally you edit only your own files. **For layout fixes only**, this temporary rule applies:

- You may add or edit CSS files named `src/ui/styles/fixes/<screen>-AI-N.css` for the screens assigned to you. Use clear comments (what was broken, at which size).
- AI-7 wires them once with `import.meta.glob('./styles/fixes/*.css', { eager: true })` in `src/ui/index.js` within the first hour, and later merges good fixes into the main CSS.
- Commit with the prefix `[AI-N][layout]`, make small commits, `git pull --rebase` first.
- If the fix needs a change in HTML or JavaScript structure of a screen you do not own, write a request `docs/requests/AI-N-to-AI-M-layout-<screen>.md` with: size, what is wrong, a suggested fix. The owner must answer within their next push.
- Never touch another AI's logic. CSS fixes only, in the fixes folder.

## 5. Who checks what (and who double-checks)

Each AI is the **checker and fixer** for the "Primary" list and the **second pair of eyes** for the "Double-check" list (find problems, write requests or fixes, do not wait).

| AI | Primary (check and fix) | Double-check (AI-N checks AI-N+1's) |
|---|---|---|
| **AI-1** | App frame: `index.html`, splash, `#app` column, wide-screen backdrop, tab bar, toast, global modal frame, Settings screen, build label, rotation and safe areas, `?debug` params | AI-2: Drop HUD |
| **AI-2** | Drop HUD: depth, gold, biome chip, strain gauge, combo bubble, HAUL UP button, pause menu; engine extremes (depth 99999, gold 1e300 through `fmt`, combo 99) and a test `tests/engine-hud-extremes.test.js` | AI-3: Workshop and Guide |
| **AI-3** | Workshop (parts grid with 26 parts, locked and owned states, upgrade tab), Guide screen; part text-limit test | AI-4: Results and goals |
| **AI-4** | Results screen (record, snap breakdown, goals, long summary sentence), goal pills, rig warning lines; biome and goal text-limit test; `session.debugView()` and `session.debugResults()` | AI-5: Crew, Rewards, modals |
| **AI-5** | Crew screen, Rewards (daily, quests, achievements), Welcome-back modal, Collapse confirmation, the hidden cheat panel; fixtures; crew, upgrade, achievement, quest text-limit test | AI-6: canvas and Home scene |
| **AI-6** | Canvas on Drop: fit, `safeRect`, pixel density, 4 and 5 lanes, rotation and resize, 320×568, sideways phone, no stretch; the Home surface scene; `dev/layout-wall.html` | AI-7: Rig and Codex |
| **AI-7** | Rig screen (grid 4×3, 5×3, 5×4, tray, sheet, drag, loadouts, all 26 parts), Codex (all tabs, silhouettes), shared components (button, card, pill, progress, sheet, tabbar); wiring of the `fixes` folder | AI-8: Home and tutorial |
| **AI-8** | Home screen (Drop button in thumb zone, banners, daily dot), the tutorial overlay and spotlight on every screen and size; the static CSS test; QA results table | AI-1: app frame and Settings |

## 6. How to work (step by step)

1. Pull. Run `npm run dev`. Open the device wall (or use browser device mode) with `?debug=1&fixture=extreme`.
2. For each screen in your Primary list, for each size in section 1: look, tap everything, scroll, rotate. Repeat with `fixture=empty` and `fixture=busy`, and with the twists.
3. Fix CSS in your fixes file, or write a layout request for structure changes.
4. Re-check after every fix. A fix that breaks another size is not a fix.
5. Repeat for the Double-check list. Write what you found as requests, or as fixes if CSS only.
6. Write your results in `docs/notes/AI-N.md` under the heading **"Layout check"** as a table: Screen × Size → PASS, or FIXED (what), or OPEN (request name). No OPEN may remain at the end.
7. Run `npm run check`, push, and tell the Manager in your notes: "LAYOUT CHECK DONE: <commit hash>".

## 7. Done means

- [ ] Every Primary and Double-check screen is PASS at every size and every twist in section 1.
- [ ] Zero sideways scroll, zero clipped text, zero overlap, zero hidden buttons, zero tap target below 44 px.
- [ ] Text-limit tests and the static CSS test pass in `npm run check`.
- [ ] Zero console errors during the whole check.
- [ ] Your "Layout check" table is complete and honest. If you could not test something, say so.

Plain-language reminder: write short sentences and simple words in everything you push.
