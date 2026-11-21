# Notes: ANDROID-1 (phone app)

## Done
- src/platform/native.js: Back button answer, keep screen awake during a drop, save when app goes to background, pay offline income when it comes back. Started from viewport.js. Tests: tests/platform-native.test.js (tests pass; not yet seen on a real phone).
- viewport.js now also sets --sat and --sab (the names the screens' CSS reads).

## Next
- Android project steps (Back button, portrait, app name and version, status bar) in tools/android-assets.sh.
- Docs: "Install on Android" in docs/PLAY.md, signed release steps.
- tools/android-native.sh (called from android-assets.sh, never fatal): portrait lock, version name/code from package.json, dark status and gesture bars, Back button hook in MainActivity. Checked on a scratch project made with `npx cap add android` (ran twice: safe). Not compiled here (no Android SDK), so android.yml retries with the stock MainActivity if it fails to compile.
- Status bar no longer overlaps the game (overlaysWebView false) so nothing hides under the clock or notch.
- docs/PLAY.md "Install on Android": first install, update (test builds get a new key each run, so uninstall plus Export/Import save), release with the 4 secrets and keystore, tagging, where to download. Old "Play on phone" section replaced by it.
- android.yml: friendly error if a signing secret is missing on a v* tag. The Android run for the Back button change was green, and its log had no fallback warning, so the Back button code compiled.

## Checks (what I saw versus what tests say)
- SAW: Android run for my last code push finished green on GitHub, with no fallback warning (the Back button code compiled). Latest run after the docs push also green.
- SAW: `npx cap add android` and `npx cap sync android` work on a scratch copy; the portrait lock, version (0.1.0, code 100), bar colours and Back button file were written, and a second run changed nothing.
- SAW: built page uses only relative paths (./assets/...), no web address starting with "/". Capacitor puts the whole page inside the APK, so it works offline after install. No service worker needed.
- TESTS ONLY (not seen on a phone): Back button answers, keep-awake, save on background, income on resume, portrait lock, status bar not overlapping.
- Test APKs get a new signing key every build, so they cannot update over each other. Documented. Idea for later: sign test APKs with the release key once the 4 secrets exist.
- Splash and icon: still the existing code-drawn public/icon-512.png via tools/android-assets.sh (stays non-fatal).

STATUS: DONE
