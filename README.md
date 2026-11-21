# Plumbline

Built by Mohammed Abdul Nayeem.

**Play now (laptop or phone browser): https://manofwhitebrown.github.io/plumbline/**

Plumbline is a phone and laptop game. You lower a weighted bucket on a rope down a bottomless well. Before each Drop you arrange parts on a small grid (the Rig). During the Drop, gems, ore and relics rise past the bucket, your parts grab them and set each other off in chains, and the rope gets tighter the deeper you go. **Haul Up** any time to keep everything. If the rope Snaps first, you keep only 30%. Between Drops you spend Gold on Crew (they earn while you rest) and on the Workshop, collect things in the Codex, and when you are ready you Collapse for Core Dust, which makes all your Gold worth more for good. One more meter.

No ads. No real-money purchases. No tracking.

## Commands

```bash
npm ci            # install
npm run dev       # play in the browser with hot reload
npm test          # all tests
npm run build     # build the game into dist/
npm run check     # tests + build + secret scan (must pass before every push)
node tools/bot.js --style=85     # a bot plays hours of the game (styles 50, 70, 85, 100)
node tools/balance-report.js     # balance page for designers
```

## Get the Android app (APK)

- **Test version (debug APK):** every push to `main` builds one. Open the repo on GitHub, go to Actions, open the newest "android" run, and download the APK from Artifacts. Step by step: [docs/ANDROID.md](docs/ANDROID.md).
- **Signed release APK:** needs the one-time signing key and four repo secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Then push a tag, for example `git tag v0.1.0 && git push origin v0.1.0`. GitHub builds, signs and attaches `plumbline-v0.1.0.apk` to a Release. Details in [docs/ANDROID.md](docs/ANDROID.md) (steps 3 to 5) and [docs/PLAY.md](docs/PLAY.md).

## Docs

- [Play guide](docs/PLAY.md): laptop, phone, and what to do if the page looks old
- [Android guide](docs/ANDROID.md): build the APK step by step
- [Final audit](docs/AUDIT.md): what was checked and what was not
- [QA reports](docs/qa/QA-2.md): what testers saw in a real browser
- [Contract](docs/CONTRACT.md): the shared rules and numbers
- [Architecture](docs/ARCHITECTURE.md): how the pieces fit

For people and AIs working on the code: commit and push after every small working piece (see docs/manager/AI_RULES.md).
