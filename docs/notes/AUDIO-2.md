# AUDIO-2 notes (sound design and adaptive music)

Owner of: `src/audio/`, `dev/audio-lab.html` + `dev/audio-lab.js`, `tests/audio-*.test.js`, this file.
Everything is generated in code. No audio files, no samples, no shipped dependencies.
The only new dependency is `node-web-audio-api` (dev only, used to render offline for measurements; the tests skip if it is missing).

## How to listen
`npm run dev`, open `/dev/audio-lab.html`, tap **Start audio**.
Buttons for every game event, every UI sound and every single voice. Sliders for combo, strain, depth, biome, SFX and music volume. Music on/off, night mode, quality, a voice counter, a scheduler-CPU meter and a level meter (turns red above -1 dB).

## Public API (CONTRACT section 11 kept, everything the game already calls kept)
`audio.init, onEvents, setBiome, setStrain, ui, mute, setVolumes, setScreen` work as before. Added:
- `audio.setNightMode(bool)` for the settings screen. Less dynamic range (compressor threshold -30 dB, ratio 7), softer highs (-7 dB shelf from 3.5 kHz), softer lows, about 2.5 dB quieter. Works before `init` too.
- `audio.setQuality('low'|'high')`. Low = at most 10 voices (4 for music), no convolver reverb, fewer music layers. Chosen automatically as `low` when the browser reports `deviceMemory <= 2`; otherwise `high`.
- `audio.ui(name, arg)` has an optional argument: `toggle(true|false)`, `slider(0..1)`, `charge(0..1)`.
- New UI names: `tab, toggle, slider, charge` (on top of tap, buy, deny, open, close, claim, place, remove, achievement, daily).
- `audio.setScreen(id)`: `'drop'` = biome music, `'results'` = quiet, anything else = gentle menu music.

### Requests for other owners (I cannot edit their files)
1. **UI (settings screen):** call `audio.setNightMode(on)` from a toggle.
2. **UI (screen router):** call `audio.setScreen('home')` (or the screen id) when a menu screen opens. Today only `'drop'` and `'results'` are called. As a safety net, music returns to the menu score by itself 9 s after `'results'`.
3. **UI sliders and hold buttons:** `audio.ui('slider', value01)` and `audio.ui('charge', progress01)` while the player drags or holds.
4. The lane count: events use `view.cols` when present, otherwise 4 (grows if a higher lane appears).

## Layout of src/audio
- `synth.js` engine core: master chain, voice tracking and stealing, reverb sends. `voices.js` voice library. `reverb.js` impulse responses and the shared convolver. `sfx.js` game events. `ui-sounds.js` interface sounds. `music.js` generative score. `heartbeat.js` strain heartbeat and creaks. `events.js` CONTRACT section 5 to sounds. `mixer.js` volumes, mute, night, visibility. `engine.js` builds all of it on any AudioContext (game, lab and offline tests share it). `scale.js`, `rng.js` scales and seeded random. `measure.js`, `offline.js` offline analysis and scene drivers (not imported by the game, so not in the bundle).

## What was built
- **Voices:** FM bell and glass (carrier + decaying modulator, optional vibrato), Karplus-Strong pluck (rendered once per pitch into a cached buffer), pad (detuned saws, slow moving low-pass, split left and right), sub bass, wind / rumble / dust textures, metallic rope creak (resonant noise gated by a fast square LFO), coin (one ping that jumps a fifth), brass, thud, boom, clang, wood crack, whoosh, mechanical tick, sparkle, woodblock click. One voice may use several oscillators and counts once.
- **Space:** one generated impulse response per biome (clay small and dry, quartz bright cave, amber warm hall, magma dark with low rumble, void and abyss huge and dark, menu light). Two convolvers crossfade when the room changes. Wet amount follows depth (0.7x at the surface to 1.3x at 600 m). Collect sounds pan by lane: lane 0 left, last lane right, 70% of the width.
- **Events:** every event in CONTRACT section 5 has layered sound (see checklist).
- **Music:** five biome keys plus a menu key, all relatives (shared notes with C pentatonic: clay C, quartz G, amber F, magma A minor, void and abyss D minor). Pad bed whose chord notes come in one step apart, sparse melody made of phrases that are sometimes replayed with a changed note, timing or length, a low pulse from 50% strain, rhythm layers (hat, knock, arpeggio) that fade in with combo and depth, biome-entry stinger, calm resolution on Haul Up, tense drop on Snap with a silent gap, menu music. A seeded random (`RUN_START.seed`) drives all choices: varied, but the same seed gives the same score. The collect notes of a gem follow the key of the current biome, so they sit inside the music.
- **Mastering:** high-pass at 20 Hz (kills DC), gentle high shelf (-1.5 dB from 7 kHz), compressor, limiter, then a soft ceiling (waveshaper) so nothing leaves above 0.96. Master gain never goes above 0.9. Music is ducked under big effects (hazard, snap, haul, record, buy, claim, achievement, daily).
- **Platform rules:** sound starts after a gesture, tab hidden suspends, gain ramps on every start and stop, at most 16 voices (music at most 8, oldest stolen first with a 15 ms fade, a "kill" gain so a steal never cancels an envelope), every start time is clamped to now + 5 ms.

## Offline measurements (48 kHz, node-web-audio-api; run `node --test tests/audio-offline.test.js`)
| Scene | Peak | Loudness | Notes |
|---|---|---|---|
| 30 s of play (collects, hazards, strain 30-95%, biome change) | -1.7 dBFS | -17.5 LUFS | 64% low, 31% mid, 5% high, 0% air, DC 2e-5, longest silence 1.0 s |
| Music alone, clay / quartz / amber / magma | about -9 dBFS | -23.1 to -23.4 LUFS | |
| Music alone, void / abyss | -11 / -10 dBFS | -26.6 / -25.8 LUFS | deliberately sparser and quieter |
| Music at strain 90%, combo 10, depth 400 | -1.9 dBFS | -18.9 LUFS | 98% of energy below 250 Hz (pulse + heartbeat) |
| Every event alone | all below -1.7 dBFS | | snap is the loudest, fire and chain the quietest |
| Every UI sound | -10 to -21 dBFS | | all fall 40 dB within 0.25 s |
Target of about -16 LUFS is met for busy play (-17.5) and music is about 6 dB under it, so effects sit on top. Tests assert: peak below 0.98, no NaN, |DC| below 0.003, no silence over 2.5 s in play, play loudness between -21 and -13 LUFS, not all in the highs, 60 simultaneous collects plus everything else never clip, night mode is not louder or brighter, low quality renders cleanly.

## Gotchas found while measuring
- WebAudio compressors add make-up gain (spec formula). It lifts quiet sounds by about 10 dB. Levels were calibrated with it on (it is part of the sound); night mode compensates for its different make-up.
- A 2x oversampled waveshaper overshoots the ceiling (we measured 1.17). It is set to no oversampling.
- `setTargetAtTime` without an anchor event misbehaves in node-web-audio-api: all gliding goes through `param.js` (`target()`).
- Cancelling a voice's scheduled envelope on a steal can make the gain jump to 1. Steals now use a separate kill gain.

## Listening checklist for the owner (what each sound should feel like)
Set Screen to **drop** unless noted. Use headphones first, then a phone speaker.
1. **Gem tier 1 glass** clear, light, like tapping a wine glass. **2 bell** soft and round. **3 warm** a plucked string, wooden and kind. **4 chime** bright, a little metallic, not shrill. **5 deep** a low bell with weight. **6 shimmer** doubled, glittering, rare-feeling. Press *Gem run* with Combo 0 and 9: the run should climb a pentatonic scale and never sound wrong against the music. Each gem has a faint sparkle on top.
2. **Ore** dull clunk, heavy, not musical. **Relic** three glass notes, magical.
3. **Part fire** a tiny mechanical tick, almost a texture. Different parts tick at different pitches. **Chain** a quick rising whoosh that sweeps across the stereo field.
4. **Miss** a soft "pff", no sting. **Hazard hit** a heavy thud with a groaning rope, music dips. **Hazard blocked** one bright clang, relieving.
5. **Strain:** move the slider from 50 to 100. At 50% a low pulse enters the music. From 60% rope creaks appear. From 75% a heartbeat starts, gets faster, lower and louder toward 100%. It should feel tense, never silly.
6. **SNAP** rope twang, wood crack, deep boom, then nearly 2 seconds of silence with the music cut. **HAUL UP** a rising whoosh then a cascade of coins that climbs the scale, with a calm falling resolution in the music. **Record** a three-note brass fanfare, proud but short. **Biome change** a swell and a bright arpeggio stinger in the new key. **Milestone** a soft two-note chime.
7. **UI family** all short and soft, same bell-like voice: tap (tiny tick), buy (two rising notes), deny (two dull falling knocks), open (air rising), close (air falling), claim (three rising notes), achievement (a little fanfare), daily (quick run plus a held note), tab (wood click), toggle (rises on, falls off), slider (pitch follows the value), charge (climbs the scale with progress). Nothing should ever hurt at full volume.
8. **Music:** listen to each biome for 2 minutes. Clay friendly and woody, quartz bright and glassy, amber warm and slow, magma dark with embers and a low rumble, void sparse with wind and long glass notes, abyss darker still. It should not feel like a loop. Change biome while playing: the crossfade should be smooth and never clash. Raise Combo and Depth: hat, then knock, then a fast arpeggio fade in. Switch Screen to home: gentle menu music; trigger a big effect and the music should duck under it.
9. **Night mode** on: calmer, darker, less punchy. **Quality low:** fewer layers, no reverb tail; should still sound complete.

## Things I am unsure about (I cannot hear)
- Overall taste: the FM bell ratios, pad filter movement, melody density and the amount of reverb are tuned by numbers and music theory, not by ear. The easiest knobs: `PRESETS` in `music.js`, `SPACES` in `reverb.js`, `GAIN` in `music.js`, `SFX_TRIM` and `MUSIC_TRIM` in `mixer.js`.
- Bass-heavy balance: 64% of the energy in busy play is below 250 Hz (heartbeat, pulse, thuds). Phone speakers cannot play that, so on a phone the pulse and snap may feel thin. If so, raise the upper partials in `sub` and `thud` (voices.js).
- The rope creak (square-gated resonant noise) may sound more like a squeaky door than a rope. `creak` in voices.js: change the LFO rate, the Q or the two band frequencies.
- Karplus-Strong plucks at the lowest pitches may sound dull on small speakers.
- `deviceMemory` auto detection exists only in Chrome based browsers. Safari always gets `high` unless the game calls `audio.setQuality('low')`.
- Real CPU on a mid phone is not measured (no device). By design: at most 16 voices, about 4 to 6 oscillators per music voice, one cached pluck buffer per pitch, two convolvers of 0.9 to 4 s only in high quality. The lab's CPU meter only shows scheduler time. Please check the Chrome task manager or a performance profile on a real phone.
- The 4 s IR for void and abyss is the heaviest part; switch those two to `len: 2.5` in `reverb.js` if a phone struggles.

STATUS: DONE
