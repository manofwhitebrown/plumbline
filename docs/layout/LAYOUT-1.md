# LAYOUT-1: layout gate results

Run on 2026-11-20 with `docs/layout/layout1-check.mjs` (headless Chrome, built game via `vite preview`). Rules: `docs/manager/LAYOUT_CHECK.md` sections 1 and 2.

PASS = no sideways scroll, no cut or overlapping text, no tap target under 44 px or closer than 8 px, no text under 12 px, nothing behind the tab bar, last item reachable, column centred on wide screens, no console error or warning. `n/a` = the Welcome back modal did not open in that state.

## Result: 0 FAIL in every table. No layout fixes were needed. Nothing is OPEN.

### Extreme fixture, all 12 sizes, no twist

| Screen | 320x568 | 360x640 | 375x667 | 360x780 | 390x844 | 412x915 | 430x932 | 768x1024 | 844x390 | 1024x768 | 1440x900 | 1920x1080 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| rig | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| crew | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| codex | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| settings | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| guide | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| drop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| results | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| welcome | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

### Empty fixture, all 12 sizes, no twist

| Screen | 320x568 | 360x640 | 375x667 | 360x780 | 390x844 | 412x915 | 430x932 | 768x1024 | 844x390 | 1024x768 | 1440x900 | 1920x1080 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| welcome | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| home | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| rig | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| crew | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| codex | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| settings | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| guide | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

### Busy fixture, all 12 sizes, no twist (banner = the Achievement unlocked banner)

| Screen | 320x568 | 360x640 | 375x667 | 360x780 | 390x844 | 412x915 | 430x932 | 768x1024 | 844x390 | 1024x768 | 1440x900 | 1920x1080 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| banner | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| home | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| rig | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| crew | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| codex | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| settings | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| guide | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

### Extreme, Large text ON

| Screen | 320x568 | 360x640 | 390x844 | 1440x900 |
|---|---|---|---|---|
| welcome | PASS | PASS | PASS | PASS |
| home | PASS | PASS | PASS | PASS |
| rig | PASS | PASS | PASS | PASS |
| crew | PASS | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS | PASS |
| codex | PASS | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS | PASS |
| settings | PASS | PASS | PASS | PASS |
| guide | PASS | PASS | PASS | PASS |
| drop | PASS | PASS | PASS | PASS |
| results | PASS | PASS | PASS | PASS |

### Extreme, notch ON (--sat 44, --sab 34)

| Screen | 320x568 | 360x640 | 390x844 | 1440x900 |
|---|---|---|---|---|
| welcome | PASS | PASS | PASS | PASS |
| home | PASS | PASS | PASS | PASS |
| rig | PASS | PASS | PASS | PASS |
| crew | PASS | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS | PASS |
| codex | PASS | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS | PASS |
| settings | PASS | PASS | PASS | PASS |
| guide | PASS | PASS | PASS | PASS |
| drop | PASS | PASS | PASS | PASS |
| results | PASS | PASS | PASS | PASS |

### Extreme, Reduce motion ON

| Screen | 320x568 | 360x640 | 390x844 | 1440x900 |
|---|---|---|---|---|
| welcome | PASS | PASS | PASS | PASS |
| home | PASS | PASS | PASS | PASS |
| rig | PASS | PASS | PASS | PASS |
| crew | PASS | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS | PASS |
| codex | PASS | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS | PASS |
| settings | PASS | PASS | PASS | PASS |
| guide | PASS | PASS | PASS | PASS |
| drop | PASS | PASS | PASS | PASS |
| results | PASS | PASS | PASS | PASS |

### Extreme, browser zoom 125% and 150% (laptop sizes)

| Screen | 1440x900 | 1024x768 |
|---|---|---|
| welcome | PASS | PASS |
| home | PASS | PASS |
| rig | PASS | PASS |
| crew | PASS | PASS |
| workshop | PASS | PASS |
| codex | PASS | PASS |
| rewards | PASS | PASS |
| settings | PASS | PASS |
| guide | PASS | PASS |
| drop | PASS | PASS |
| results | PASS | PASS |

### Extreme, rotate portrait to sideways and back

| Screen | 320x568 rotate | 360x640 rotate | 390x844 rotate |
|---|---|---|---|
| home | PASS | PASS | PASS |
| rig | PASS | PASS | PASS |
| crew | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS |
| codex | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS |
| settings | PASS | PASS | PASS |
| guide | PASS | PASS | PASS |

### Busy, Large text ON

| Screen | 320x568 | 390x844 | 1440x900 |
|---|---|---|---|
| banner | PASS | PASS | PASS |
| home | PASS | PASS | PASS |
| rig | PASS | PASS | PASS |
| crew | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS |
| codex | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS |
| settings | PASS | PASS | PASS |
| guide | PASS | PASS | PASS |

### Busy, notch ON

| Screen | 320x568 | 390x844 | 1440x900 |
|---|---|---|---|
| banner | PASS | PASS | PASS |
| home | PASS | PASS | PASS |
| rig | PASS | PASS | PASS |
| crew | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS |
| codex | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS |
| settings | PASS | PASS | PASS |
| guide | PASS | PASS | PASS |

### Empty, Large text, notch and Reduce motion together in one list (3 runs)

| Screen | 320x568 | 390x844 | 1440x900 |
|---|---|---|---|
| welcome | n/a | n/a | n/a |
| home | PASS | PASS | PASS |
| rig | PASS | PASS | PASS |
| crew | PASS | PASS | PASS |
| workshop | PASS | PASS | PASS |
| codex | PASS | PASS | PASS |
| rewards | PASS | PASS | PASS |
| settings | PASS | PASS | PASS |
| guide | PASS | PASS | PASS |
| drop | PASS | PASS | PASS |
| results | PASS | PASS | PASS |

## What the runner does not cover (honest list)
- **Layout jump** when a number grows or a toast appears (rule 9) is not measured. The counters use fixed-width number boxes and toasts are laid over the screen, but nobody timed it.
- **On-screen keyboard** (rule 3): the game has no text fields on these screens, so it was not tested.
- **Contrast** (rule 11) and how things look were not judged by the runner. Screenshots are saved to /tmp/plumbline-shots, and a 390x844 contact sheet of all screens was looked at by eye.
- **Sideways phone Drop screen** passes the checks, but the canvas look was not compared to a real device.
- **Only some modals and sheets**: the Welcome back modal is checked at every size. Other sheets (Rig part sheet, Collapse confirm, Codex details) were not opened by the runner.
- Twists on one fixture only where listed above. Large text, notch and Reduce motion were run on four key sizes (320x568, 360x640 or 390x844, 1440x900), not all 12.
- Real phones, real Android text size and the real on-screen safe areas were not available. Notch is simulated with the CSS variables and the browser safe-area override.

## Audit false alarms found and handled (so the next person does not chase them)
- The drifting backdrop (`.ui-bd`) sits a few px outside the screen on purpose.
- Floating gold numbers on Drop (`.hud-pops`) fade out, are not tappable and are aria-hidden.
- A glow box inside the Workshop counters made `scrollHeight` too big: the text was never cut.
- The Drop button pulses, which made the gap to Clear look 7 px instead of 8. The runner freezes animations while measuring.
- Screen changes and the Achievement banner slide in. The runner waits until they stop.
- The Welcome back modal sits on top of the screen. It is checked on its own, then closed.

## How to rerun
See the top of `docs/layout/layout1-check.mjs`. Use `vite preview` (the dev server never goes idle).
