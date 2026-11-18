# Art direction (AI-2, polish)

Mood: a deep, warm, mysterious well. One lantern in the dark. Calm, rich, never loud.
Gameplay clarity always wins over decoration. Items, dangers and the HUD zones (top 88 px, bottom 120 px) are never covered.

## 1. Colour script and light plan

Light comes from two places: the **well mouth** far above (a cool, soft cone that fades with depth) and the **lantern** on the bucket (warm, small, follows the bucket). The deeper you go, the less cone and the more lantern.

| Biome | Mood | Wall and air | Lantern glow | Ambience (small, calm) | Wall detail |
|---|---|---|---|---|---|
| clay (0-100 m) | warm, safe, dusty | browns `#3a2a22` to `#1b1410` | soft gold `#ffd9a0` | slow dust motes | hanging roots |
| quartz (100-250 m) | cold, clear, still | blues `#1c2a4a` to `#0b1020` | pale blue-white `#a9c4ff` | faint twinkles | crystal clusters |
| amber (250-450 m) | honey, living | oranges `#4a3213` to `#1a1006` | honey `#ffc56b` | pollen drift, a few fireflies | glowing resin veins |
| magma (450-700 m) | hot, tense | reds `#4a1a14` to `#14070a` | orange `#ff8a55` | rising embers, slow heat shimmer | glowing cracks, stalactites |
| void (700-1000 m) | lonely, strange | violets `#1a0f33` to `#05030d` | violet `#b583ff` | slow wisps, tiny stars | pale veins |
| abyss (1000 m+) | dim, endless | deep plum `#12081f` to `#020108` | magenta `#d06bff` | a dim mix of all | long dark roots and crystals |

Rules for colour:
- Use only palette colours (`src/render/palette.js`). Tints come from the biome `glow` and `mote` keys.
- Never pure white or pure black. Darkest ink is `#020108`.
- Gems (tier colours) must stay the brightest, most saturated things on screen. Polish layers stay under them in contrast.
- A biome change blends over the last 15 m before the edge. A colour jump is a bug.
- Danger warms the light (toward `#ff7a45`), it never floods the screen red.

## 2. Motion rules

| Thing | Rule |
|---|---|
| Easing | Ease-out for things that arrive (`cubic-bezier(0.2, 0.8, 0.2, 1)`). Springs for values that follow a target. No linear fades except light flicker. |
| Duration | 160 ms small, 220 ms screens, 260 ms sheets and bars. Nothing over 400 ms in the UI. |
| Screen shake | Max 6 px for a hit, 3 px as a nudge. Never on every beat. Off with Reduce motion. |
| Pulse / zoom pulse | Max 3 percent scale. Max 2 per second. Heartbeat 1 to 3 beats per second only near a Snap. |
| Hit-stop | 40 to 80 ms, only for big collects and the Snap. Never twice in 400 ms. |
| Glow | Soft, wide, low alpha (0.05 to 0.35). Flicker amplitude max 15 percent. |
| Particles | Polish total max 120. Small (1 to 3 px), slow (under 40 px per second), low alpha. |
| Reduce motion | No shake, no pulse, no flicker, no drifting. Static light only. |
| Quality low | Only the gradient blend and a static lantern glow. No ambience, no wall detail, no bloom. |

## 3. Premium checklist (use it to review any screen)

1. One clear focus per screen. Everything else is quieter.
2. Cards have a soft layered shadow and a thin inner highlight, not a hard border alone.
3. Primary buttons are gold with a gentle glow. Only one primary per view.
4. Every tap gives feedback in under 100 ms (press-in, sound, or both).
5. Numbers use tabular figures and animate when they change. They never jump the layout.
6. Disabled things say why. Failed actions shake and show a message.
7. Motion is 160 to 260 ms and eased. Nothing bounces for fun.
8. Colours come from tokens. No new colours, no pure black or white.
9. Text is plain, short, and uses glossary words only.
10. Reduce motion and Large text still look good.
11. Empty, mid-game and huge-number states all look good (no cut-off, no overlap).
12. Nothing flickers, strobes or distracts from the rope and the items.
