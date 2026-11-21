// Help text for the little "i" tips. Plain words only (see docs/WORDS.md). No logic.
// Each line is at most HELP_MAX characters so it always fits a small phone.
// Keys are stable ids. A screen asks for one by id: helpText('crew').
export const HELP_MAX = 90;

const e = (title, text) => Object.freeze({ title, text });

export const HELP = Object.freeze({
  gold: e('Gold', 'Gold pays for Parts, Crew and upgrades. You earn it from gems and ore.'),
  rig: e('Rig', 'The Rig is the grid on your bucket. Put Parts on it before each Drop.'),
  drop: e('Drop', 'Drop lowers your bucket down the well. Go deep, then Haul Up to keep it all.'),
  part: e('Part', 'A Part sits on the Rig and does one job, like grabbing gems or guarding the rope.'),
  combo: e('Combo', 'Parts placed in the right spots boost each other. A Combo shows when they match.'),
  loadout: e('Loadout', 'A Loadout is a saved Rig. Tap a slot to load it. Press and hold to save.'),
  suggest: e('Suggest', 'Suggest fills the Rig with the best Parts you own. You can still change it.'),
  strain: e('Strain', 'Strain is how tight the rope is. It grows as you go deeper. Full means Snap.'),
  haulUp: e('Haul Up', 'Haul Up pulls the bucket up and keeps everything you found. Do it before a Snap.'),
  snap: e('Snap', 'If the rope Snaps, you keep only 30% of what you found. Haul Up in time.'),
  shards: e('Shards', 'Shards are a rare coin. Goals and guardians give them. Spend them in the Workshop.'),
  coreDust: e('Core Dust', 'Core Dust comes from a Collapse. Each piece adds 10% to all Gold, for good.'),
  collapse: e('Collapse', 'Collapse is a fresh start. You lose Gold, Crew and Parts, and gain Core Dust.'),
  codex: e('Codex', 'The Codex is your book of finds: gems, Parts, Combos and relics you have seen.'),
  goals: e('Goals', 'Goals are small jobs for each Drop. Finish them to earn Shards.'),
  crew: e('Crew', 'Crew earn Gold every second, even when you are away. Buy more to earn faster.'),
  manager: e('Manager', 'A Manager triples what one kind of Crew earns. Hire one when it is offered.'),
  milestone: e('Milestone', 'Own 10, 25, 50 or more of one Crew and its Gold per second doubles.'),
  workshop: e('Workshop', 'The Workshop sells new Parts and upgrades. Spend your Gold and Shards here.'),
  boon: e('Boon', 'A Boon is a gift you pick during a Drop. It helps until that Drop ends.'),
  brace: e('Brace', 'Brace eases the rope and slows the bucket for a moment. Tap it when Strain is high.'),
  surge: e('Surge', 'Surge makes Gold count double for a moment, but the rope pulls harder.'),
  flare: e('Flare', 'Flare lights the way and clears the next row of dangers.'),
  guardian: e('Guardians', 'Guardians are big fights deep down. Grab the marked gems to win.'),
  relic: e('Relics', 'Relics are rare finds. Each gives a small bonus for good. Collect a whole set.'),
  daily: e('Daily reward', 'Come back each day for free Gold and Shards. A longer streak pays more.'),
  danger: e('Danger', 'Danger hurts the rope if you do not stop it. Parts that guard keep it safe.'),
});

// Where each help id is used on screen, for the tests and the notes.
export const HELP_IDS = Object.freeze(Object.keys(HELP));

// Safe lookup. A bad id gives a calm default, never a crash.
export function helpText(id) {
  const k = typeof id === 'string' ? id : '';
  const item = HELP[k];
  return item ? item.text : 'Tap anywhere to close.';
}

export function helpTitle(id) {
  const k = typeof id === 'string' ? id : '';
  const item = HELP[k];
  return item ? item.title : 'Help';
}
