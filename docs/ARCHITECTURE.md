# Architecture

(Full version is written in the integration phase. This is the short map.)

Layers, low to high:

1. `src/core/` and `src/platform/`: bus, rng, save, loop, format, log, clock, haptics, viewport.
2. `src/engine/`: pure run logic. No screen, no timers. Same seed gives the same run.
3. `src/run/`, `src/meta/`: a drop session and the long-term game (gold, crew, upgrades).
4. `src/render/`, `src/audio/`, `src/ui/`: what the player sees and hears. They listen to events.
5. `src/main.js`: boots everything in order.

See `docs/CONTRACT.md` for every public function.
