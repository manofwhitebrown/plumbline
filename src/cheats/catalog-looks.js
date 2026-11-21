// Cheats for the Relic Wall and the Looks. [HOOK-3]
// They open everything to look at. They mark the save Cheats used (done by the cheat menu),
// and cheated saves earn no bonus from them: the Wall bonus and real unlocks ignore these.
import { recordAllCheat } from '../meta/relicBook.js';
import { setCheatAll } from '../meta/cosmetics.js';
import { COSMETICS } from '../data/cosmetics.js';
import { RELICS } from '../data/relics.js';

export const LOOKS_CHEATS = [
  { id: 'relics_all', group: 'Progress', label: 'Show every relic on the Wall',
    run: () => { const n = recordAllCheat(); return n ? `${n} relics shown on the Wall` : `All ${RELICS.length} relics are already on the Wall`; } },
  { id: 'looks_all', group: 'Progress', label: 'Unlock every Look',
    run: () => { const first = setCheatAll(); return first ? `All ${COSMETICS.length} Looks unlocked` : 'Every Look is already unlocked'; } },
];
