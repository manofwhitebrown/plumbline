# AI RULES (read this first, every AI)

## The game
PLUMBLINE: portrait-first phone and laptop game. A weighted bucket on a rope is lowered down a bottomless well. Before each drop the player arranges parts on a small grid (the Rig). During the drop (45 to 90 s) gems, ore, relics and hazards rise in lanes, parts grab them and trigger each other in chains, and rope Strain climbs with depth. Haul Up any time banks everything; if the rope Snaps first the player keeps only 30%. Between drops: Crew (idle income), Workshop, Codex, Goals, Collapse (prestige, gives Core Dust: each piece = +10% Gold for good). Core feeling: "one more meter".
The owner (Mohammed Abdul Nayeem) is not a programmer: plain words in every note and message. Player-facing words come only from docs/WORDS.md; never show developer words on screen.

## Repo and git
- Repo: https://github.com/manofwhitebrown/plumbline. Work only on main. No branches, no pull requests, never force-push.
- The token is in your prompt. NEVER write it into any file, note, test, commit message or git remote URL. Use only the gitx helper from your prompt. After cloning, `grep -c github_pat .git/config` must print 0.
- Share: `gitx pull --rebase origin main ; npm run check ; gitx push origin HEAD:main`.
- Git identity: user.name "<YOUR NAME>", user.email "<yourname>@plumbline.local", commit prefix [<YOUR NAME>].

## Push often
You can be cut off at any moment; unpushed work is lost. Commit and push after EVERY small working piece. Add a line to docs/notes/<YOUR NAME>.md after each push (done, next). When low on usage: stop starting new things, push, write notes, end with a STATUS line. Never push a red npm run check. If it is red because of someone else's file, push your own files if your tests pass and write docs/requests/<YOUR NAME>-to-Manager-red.md.

## Read first
docs/manager/PUSH_OFTEN.md, docs/CONTRACT.md, docs/manager/LAYOUT_CHECK.md, docs/manager/RENDER_ARBITRATION.md, docs/design/ART_DIRECTION.md, docs/WORDS.md, docs/CHEATS.md, docs/AUDIT.md, docs/notes/*.md (skim), docs/requests/*.md.

## Tech
Node 22, Vite, vanilla JavaScript ES modules, Canvas 2D for the well, DOM and CSS for menus, Capacitor for Android, tests with node:test. No frameworks, no new shipped dependencies, everything drawn in code. Commands: npm run dev, npm test, npm run build, npm run check (tests + build + secret scan). The engine is deterministic and pure; events are the only language between engine, renderer, audio and UI; all numbers live in src/data; every public function validates input and fails soft; save data is versioned slices in src/core/save.

## Rules
- Edit only the files you own. For anything else file docs/requests/<YOUR NAME>-to-<OTHER>-topic.md.
- 60 fps on a mid-range Android phone, no per-frame allocations, particles under 300. Respect Reduce motion, quality low, Large text and layout limits (part name 14, description 90, combo name 20, biome name 12, goal text 28, crew and upgrade names 22, any formatted number 8 characters, taps 44 px, 320x568 must work).
- Tests for logic. New cheats go in src/cheats and docs/CHEATS.md.
- Be honest: say "tests pass" versus "I saw it work".
- End your notes with STATUS: DONE or STATUS: NOT DONE (why).

## Optional real browser
One AI found a headless Chromium works in its sandbox. In a scratch folder (NOT the repo) run `npm i puppeteer-core @sparticuz/chromium`, launch with chromium.executablePath() and headless: 'shell', and open `npx vite --port 5173`. If it does not work, use jsdom and PNG previews from dev/art-lab.
