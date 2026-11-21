// The guided steps, in plain words. Each step points at screen parts by name.
// UI elements carry data-tut="<name>". If a name is missing, the step is skipped.
//
// Fields:
//   targets   names to highlight (all that exist are shown). Empty = a message with no highlight.
//   mode      'info' shows a "Got it" button. 'action' waits for the player to do the thing.
//   on        ways to finish the step:
//               { bus: 'run:started' }            a game event
//               { bus: 'meta:changed', match: 'part' }   only when the event text has this word
//               { afterMs: 6000 }                 a timer
//               { appears: 'workshop-part' }      a screen part shows up
//             any of them may add goto: '<step id>' to jump instead of going to the next step
//   findMs    how long to look for the target before giving up on the step (default 3000)
//   skipTo    where to go when the target is never found
//   maxMs     give up on an action step after this long
//   maxTo     where to go then

export const FIRST_DROP_SEED = 7;
export const SAFE_DEPTH = 40;
// Timing note: the two hint steps take 14 s each (beats are 800 ms), so Haul is offered at about 28 s (35 m, inside the safe 40 m),
// when the fixed-seed first drop has earned about 27 Gold. The Magnet costs 22, so the first part can be bought.

export const STEPS = [
  { id: 'home-drop', targets: ['home-drop'], text: 'Tap Drop.', mode: 'action', group: 'drop',
    on: [{ bus: 'run:started' }], skipTo: 'drop-gems' },
  { id: 'drop-gems', targets: ['well'], text: 'Gems rise past your bucket. The Hook collects them for Gold.', mode: 'info', group: 'drop',
    on: [{ afterMs: 14000 }, { bus: 'run:ended', goto: 'results-gold' }], skipTo: 'drop-strain' },
  { id: 'drop-strain', targets: ['strain'], text: 'The rope gets tighter the deeper you go.', mode: 'info', group: 'drop',
    on: [{ afterMs: 14000 }, { bus: 'run:ended', goto: 'results-gold' }], skipTo: 'drop-haul' },
  { id: 'drop-haul', targets: ['haul'], text: 'Tap Haul Up to keep what you found.', mode: 'action', group: 'drop',
    on: [{ bus: 'run:ended', goto: 'results-gold' }], skipTo: 'results-gold' },
  { id: 'results-gold', targets: ['results-gold'], text: 'That is your Gold. Spend it in the Workshop.', mode: 'info',
    on: [{ afterMs: 9000 }], skipTo: 'results-home' },
  // The Results screen has no tab bar, so first send the player Home (found by playing in a real browser).
  { id: 'results-home', targets: ['results-home'], text: 'Tap Home.', mode: 'action',
    on: [{ appears: 'tab-workshop' }], skipTo: 'tab-workshop', maxMs: 30000, maxTo: 'tab-workshop' },
  { id: 'tab-workshop', targets: ['tab-workshop'], text: 'Open the Workshop.', mode: 'action',
    on: [{ appears: 'workshop-part' }], skipTo: 'final', maxMs: 25000, maxTo: 'final' },
  { id: 'workshop-buy', targets: ['workshop-part'], text: 'Buy your first part.', mode: 'action',
    on: [{ bus: 'meta:changed', match: 'part' }], skipTo: 'final', maxMs: 45000, maxTo: 'final' },
  { id: 'tab-rig', targets: ['tab-rig'], text: 'Now open the Rig.', mode: 'action',
    on: [{ appears: 'rig-grid' }], skipTo: 'final', maxMs: 25000, maxTo: 'final' },
  { id: 'rig-place', targets: ['rig-new-part', 'rig-good-cell'], text: 'Put your new part on the bucket.', mode: 'action',
    on: [{ bus: 'rig:changed' }], skipTo: 'final', maxMs: 40000, maxTo: 'final' },
  { id: 'second-drop', targets: ['home-drop', 'rig-drop', 'tab-home'], text: 'Drop again.', mode: 'action',
    on: [{ bus: 'run:started' }], skipTo: 'crew-intro', maxMs: 60000, maxTo: 'crew-intro' },
  // Two short, skippable notes. They wait (findMs) until a screen with the tab bar is showing again after the second drop.
  { id: 'crew-intro', targets: ['tab-crew'], text: 'Crew earn Gold while you rest. Open Crew any time.', mode: 'info',
    on: [{ afterMs: 60000 }], skipTo: 'final', findMs: 180000 },
  { id: 'workshop-intro', targets: ['tab-workshop'], text: 'The Workshop sells new Parts and upgrades.', mode: 'info',
    on: [{ afterMs: 30000 }], skipTo: 'final', findMs: 20000 },
  { id: 'final', targets: [], text: 'Go deeper. One more meter.', mode: 'info',
    on: [{ afterMs: 4500 }] },
];

// Where to pick up after a reload. A drop or results screen is gone after a reload.
export function resumeId(stepId) {
  if (stepId === 'drop-gems' || stepId === 'drop-strain' || stepId === 'drop-haul') return 'home-drop';
  if (stepId === 'results-gold' || stepId === 'results-home') return 'tab-workshop';
  return STEPS.some((s) => s.id === stepId) ? stepId : STEPS[0].id;
}

// True while the player is still on the first, scripted-safe drop.
export function isFirstDropStep(stepId) {
  return stepId === 'home-drop' || stepId === 'drop-gems' || stepId === 'drop-strain' || stepId === 'drop-haul';
}
