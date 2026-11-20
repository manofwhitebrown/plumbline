Owned folder. See docs/CONTRACT.md for the owner and the public API.

# Audio public API (src/audio/index.js, `audio`)

Everything is generated in code. Details, measurements and the listening checklist: docs/notes/AUDIO-2.md.

| Call | What it does |
|---|---|
| `audio.init()` | Call on the first user gesture. Returns false if WebAudio is missing (everything else then does nothing, safely). |
| `audio.onEvents(events, view)` | Plays sound for CONTRACT section 5 events. |
| `audio.setBiome(id)` | Biome key, room reverb and music. Safe before `init`. |
| `audio.setStrain(value01)` | Drives the pulse (over 50%), creaks (over 60%) and heartbeat (over 75%). |
| `audio.setScreen(id)` | `'drop'` biome music, `'results'` quiet (menu music returns after 9 s), any other id gentle menu music. |
| `audio.ui(name, arg?)` | `tap buy deny open close claim place remove achievement daily tab toggle slider charge collapse`. Optional arg: `toggle(bool)`, `slider(0..1)`, `charge(0..1)`. |
| `audio.mute(bool)`, `audio.setVolumes({sfx, music})` | Always work. Values 0..1, master never above 0.9. |
| `audio.setNightMode(bool)` | **New.** For the settings screen. Less dynamic range, softer highs and lows, a little quieter. Safe before `init`. |
| `audio.setQuality('low'\|'high')` | **New.** Low: at most 10 voices, no convolver reverb, fewer music layers. Auto `low` when `navigator.deviceMemory <= 2`. |

Rules: sound starts only after a gesture, suspends in a hidden tab, ramps every gain (no clicks), master soft ceiling 0.96, at most 16 voices (oldest stolen).
