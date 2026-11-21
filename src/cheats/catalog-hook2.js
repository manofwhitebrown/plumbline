// Cheats for Contracts, Mastery and the Daily Dive. They use the normal meta functions.
import * as contracts from '../meta/contracts.js';
import * as mastery from '../meta/mastery.js';
import * as dive from '../meta/dive.js';
import { s } from '../meta/state.js';

export const HOOK2 = [
  { id: 'contract_done', group: 'Progress', label: 'Finish one Contract',
    run: () => { const t = contracts.cheatComplete(); return t ? `Finished: ${t}` : 'All Contracts are already finished'; } },
  { id: 'mastery_add', group: 'Progress', label: 'Add 1 Mastery to every owned Part',
    run: () => { let n = 0; for (const id of Object.keys(s().parts)) if (s().parts[id] > 0) { const b = mastery.level(id); if (mastery.addLevel(id) > b) n++; } return `${n} Parts gained a Mastery level`; } },
  { id: 'mastery_reset', group: 'Progress', label: 'Reset all Mastery', run: () => { mastery.resetAll(); return 'Mastery is back to 0'; } },
  { id: 'dive_reset', group: 'Progress', label: 'Reset the Daily Dive (new try)', run: () => { dive.cheatReset(); return 'You can dive again today'; } },
];
