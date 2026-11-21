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
