# Notes: ANDROID-1 (phone app)

## Done
- src/platform/native.js: Back button answer, keep screen awake during a drop, save when app goes to background, pay offline income when it comes back. Started from viewport.js. Tests: tests/platform-native.test.js (tests pass; not yet seen on a real phone).
- viewport.js now also sets --sat and --sab (the names the screens' CSS reads).

## Next
- Android project steps (Back button, portrait, app name and version, status bar) in tools/android-assets.sh.
- Docs: "Install on Android" in docs/PLAY.md, signed release steps.
