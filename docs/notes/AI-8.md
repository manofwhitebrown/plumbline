# Notes — AI-8 (audio, tutorial, suggest, QA bot)

## Done
- Stubs pushed for every public function in CONTRACT section 11: `audio`, `tutorial`, `suggest`.
- Pentatonic scale and combo-to-note mapping (real, not a stub).
- Stub tools: `tools/bot.js`, `tools/balance-report.js`.

## In progress
- Real WebAudio voices, sound effects and music.
- Waiting for `package.json` from AI-1, so `npm run check` cannot run yet. Tests were run with `node --test tests/`.

## Blocked
- Nothing yet. Real `suggest`, bot and integration tests need AI-2 (engine), AI-3 (parts), AI-4 (run) and AI-5 (meta).

## What other AIs must know
- `audio.init()` must be called from a real tap or key press.
- All audio calls are safe: bad input is ignored and nothing throws.
- `suggest.bestRig` currently returns an empty rig of the right size.
