// The `meta` object (CONTRACT section 8). Everything here validates its input and fails soft.
import { s, changed } from './state.js';
import { money, clamp } from './safe.js';
import { now } from './time.js';
import { addGold, spendGold, addShards, spendShards } from './wallet.js';
import { getMods } from './mods.js';
import * as workshop from './workshop.js';
import * as crew from './crew.js';
import * as offline from './offline.js';
import * as collapse from './collapse.js';
import * as upgrades from './upgrades.js';
import * as daily from './daily.js';
import * as quests from './quests.js';
import * as achievements from './achievements.js';
import * as codex from './codex.js';
import * as stats from './stats.js';
import * as runhooks from './runhooks.js';
import { log } from '../core/log.js';

let acc = { emit: 0, check: 0, save: 0, day: 0 };

// Call every frame or every second with the time that passed (ms).
// Big gaps are ignored here on purpose: they belong to meta.offline.
function tick(dtMs) {
  try {
    const dt = clamp(dtMs, 0, 1000);
    if (dt <= 0) return;
    const gps = crew.perSecond();
    if (gps > 0) addGold((gps * dt) / 1000);
    const st = s();
    st.stats.playMs = money(st.stats.playMs + dt);
    st.lastSeen = now();
    acc.emit += dt; acc.check += dt; acc.save += dt; acc.day += dt;
    if (acc.emit >= 250) { acc.emit = 0; changed('gold'); }
    if (acc.check >= 2000) { acc.check = 0; achievements.check(); }
    if (acc.day >= 30000) { acc.day = 0; quests.ensureToday(); }
  } catch (e) { log.error('meta.tick failed', e && e.message); }
}

function init() {
  try {
    runhooks.start();
    // Work out away income now and keep it until the player claims it. This way the first
    // tick of the game clock can never wipe it out.
    offline.peek();
    quests.ensureToday();
    achievements.check();
  } catch (e) { log.error('meta.init failed', e && e.message); }
}

export const meta = {
  init,
  getMods,
  gold: () => s().gold,
  shards: () => s().shards,
  coreDust: () => s().coreDust,
  addGold: (n) => addGold(n),
  spendGold,
  addShards: (n) => addShards(n),
  spendShards,
  ownedParts: workshop.ownedParts,
  canBuyPart: workshop.canBuyPart,
  buyPart: workshop.buyPart,
  partStatus: workshop.partStatus,
  workshop: { list: workshop.list, copiesAllowed: workshop.copiesAllowed },
  crew: { list: crew.list, buy: crew.buy, hireManager: crew.hireManager, perSecond: crew.perSecond },
  offline: { peek: offline.peek, claim: offline.claim },
  collapse: { available: collapse.available, preview: collapse.preview, do: collapse.doCollapse },
  upgrades: {
    list: upgrades.list, buy: upgrades.buy, info: upgrades.info,
    loadoutSlots: upgrades.loadoutSlots, hasExtraCopy: upgrades.hasExtraCopy,
    autoHaul: upgrades.autoHaul, setAutoHaul: upgrades.setAutoHaul,
  },
  daily: { state: daily.state, claim: daily.claim, setTwist: daily.setTwist },
  quests: { list: quests.list, claim: quests.claim, unclaimed: quests.unclaimedCount },
  achievements: { list: achievements.list },
  codex: { list: codex.list, record: codex.record, has: codex.has, progress: codex.progress },
  stats: { get: stats.get },
  isCheated: () => s().cheated,
  tick,
};

init();
export default meta;
