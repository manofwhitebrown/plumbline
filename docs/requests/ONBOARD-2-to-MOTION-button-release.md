# Request to MOTION-1 (or whoever owns src/ui/motion): taps that are not in the middle of a button miss it

Plain words: when a finger lifts off a button, the "release spring" makes the button shrink to about 3% of its size for a moment.
A tap that is not near the exact middle then lands next to the button, and nothing happens.

Seen in a real headless Chromium at 360x640 with real touch taps (saw it, not only tests):
- Home: tap on the Drop button 60 px left of its middle -> the click went to `div.home-bottom`, no drop started.
- Results: at the moment of the click the Home button was 5x1 px, so Home, Tweak rig and Drop again did nothing for a tap in the middle of the button (the middle was 1 px outside the shrunk box).
- With Reduce motion on, the same taps work.

Cause: `src/ui/motion/micro.js`, "button release", `anim(b, [{ transform: 'scale(-0.03)' }, { transform: 'scale(0.015)', offset: 0.55 }, { transform: 'scale(0)' }], ...)` with `composite: 'add'`.
For transforms, `add` joins the lists, so `scale(-0.03)` is the real scale (about 0 and flipped), not "1 minus 0.03".

Suggested fix: use real values and no `composite: 'add'`: `[{ transform: 'scale(0.97)' }, { transform: 'scale(1.015)', offset: 0.55 }, { transform: 'scale(1)' }]`.
The same pattern is in `src/ui/motion/results.js` (`scale(-0.08)`, `scale(-0.06)`, `scale(-0.4)` ...) and probably shows rows at about 0 size at the start; please check every `scale(` with `composite: 'add'`.
Also worth a test: a button's box during the animation must stay at least 90% of its normal size.

I did NOT edit these files (not mine). Filed by ONBOARD-2.
