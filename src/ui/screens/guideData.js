// Guide content. Every number is read from the data files, so the text can never go out of date.
// Pure functions: no page, no save. Tests can call them directly.
import { ENGINE } from '../../data/engine.js';
import { LIMITS, COLLAPSE } from '../../data/upgrades.js';
import { CREW } from '../../data/crew.js';
import { DAILY } from '../../data/rewards.js';
import { PART_DATA, FAMILIES } from '../../data/parts.js';
import { biomes } from '../../data/biomes.js';
import { fmt, fmtDepth } from '../../core/format.js';
import { HELP } from '../../data/help.js';

// Words that have no screen title of their own. Same plain lines as the "i" tips.
const WORD_IDS = ['combo', 'loadout', 'suggest', 'boon', 'brace', 'surge', 'flare', 'guardian', 'relic', 'shards', 'goals', 'codex', 'manager', 'milestone', 'daily'];

const FAMILY_TITLE = {
  collector: 'Collectors', processor: 'Processors', defense: 'Defense', engine: 'Engines', special: 'Specials',
};
const FAMILY_LINE = {
  collector: 'Grab what passes by.',
  processor: 'Make gems worth more.',
  defense: 'Protect the rope.',
  engine: 'Change how you sink.',
  special: 'Odd tricks and rare finds.',
};

function pct(x) {
  return Math.round((Number(x) || 0) * 100) + '%';
}

// Strain gained each second at a given Depth (before any Part helps).
export function strainPerSecond(depth) {
  const d = Math.max(0, Number(depth) || 0);
  const perStep = ENGINE.strainBase + ENGINE.strainPerMeter * d;
  const perSecond = perStep * (1000 / ENGINE.baseBeatMs) * ENGINE.baseSpeed;
  return Number.isFinite(perSecond) ? perSecond : 0;
}

// One part per family for the icons: the first part of that family in the data.
export function familyShowcase() {
  return FAMILIES.map((fam) => {
    const ids = Object.keys(PART_DATA).filter((id) => PART_DATA[id].family === fam);
    return {
      family: fam,
      title: FAMILY_TITLE[fam] || fam,
      line: FAMILY_LINE[fam] || '',
      partIds: ids,
      sample: ids.slice(0, 3).map((id) => ({ id, name: PART_DATA[id].name, desc: PART_DATA[id].desc })),
    };
  });
}

export function biomeSteps() {
  let list = [];
  try { list = biomes.list(); } catch (e) { list = []; }
  return list.map((b) => ({ id: b.id, name: b.name, from: b.from }));
}

// sizes: { cols, rows } of the player's bucket right now (optional).
// collapseInfo: { resets: string[], keeps: string[] } from meta (optional).
export function guideSections(sizes, collapseInfo) {
  const cols = sizes && Number.isFinite(sizes.cols) ? sizes.cols : 4;
  const rows = sizes && Number.isFinite(sizes.rows) ? sizes.rows : 3;
  const steps = biomeSteps();
  const first = steps[1];
  const top = strainPerSecond(0);
  const deep = strainPerSecond(500);
  const keep = LIMITS.baseKeepOnSnap;
  const crewFirst = CREW[0];
  const crewLast = CREW[CREW.length - 1];
  const resets = collapseInfo && Array.isArray(collapseInfo.resets) && collapseInfo.resets.length
    ? collapseInfo.resets : ['Gold', 'Crew', 'Parts'];
  const keeps = collapseInfo && Array.isArray(collapseInfo.keeps) && collapseInfo.keeps.length
    ? collapseInfo.keeps : ['Core Dust', 'Shards', 'Codex', 'Best Depth'];
  const dust = Math.round(LIMITS.coreDustGoldEach * 100);

  return [
    {
      id: 'goal', title: 'The goal',
      lines: [
        'Lower a bucket down a deep well. Gems and ore rise past it. Your Parts grab them for Gold.',
        'Go deeper to find better gems. Each new Biome is richer than the last' + (first ? ': ' + first.name + ' starts at ' + fmtDepth(first.from) + '.' : '.'),
        'Spend your Gold in the Workshop. Then Drop again, and go deeper.',
      ],
    },
    {
      id: 'parts', title: 'Parts and rigs',
      lines: [
        'Your Rig is a grid on the bucket. Yours is ' + cols + ' wide and ' + rows + ' tall. It can grow.',
        'Things rise from below, so the bottom row meets them first. Each column works on its own.',
        'Put Parts in the grid on the Rig screen. Some Parts make a Combo when they sit in the right spots. Combos pay extra.',
      ],
      families: true,
    },
    {
      id: 'strain', title: 'Strain and Haul Up',
      lines: [
        'The rope has ' + fmt(LIMITS.baseMaxStrain) + ' Strain to give. It gains about ' + top.toFixed(1) + ' Strain each second at the top, and about ' + deep.toFixed(1) + ' at ' + fmtDepth(500) + '.',
        'Dangers hit the rope too. Some Parts take Strain away.',
        'Tap Haul Up to keep everything you found. If the rope Snaps, you keep only ' + pct(keep) + ' of your Gold.',
        'Watch the gauge. When it is nearly full, choose: keep going, or Haul Up.',
      ],
    },
    {
      id: 'crew', title: 'Crew and Workshop',
      lines: [
        'The Workshop sells new Parts and upgrades. Parts you buy are yours for good.',
        'Crew earn Gold for you, even when you are away. ' + (crewFirst ? crewFirst.name + ' costs ' + fmt(crewFirst.baseCost) + ' Gold' : 'Crew cost Gold') + (crewLast ? ', and ' + crewLast.name + ' costs ' + fmt(crewLast.baseCost) + '.' : '.'),
        'Each Crew you own makes the next one cost more. Big milestones double what they earn.',
        'Claim your daily reward on the Rewards screen. A ' + DAILY.length + '-day streak pays more each day.',
      ],
    },
    {
      id: 'collapse', title: 'Collapse',
      lines: [
        'Collapse is a fresh start. It opens at a best Depth of ' + fmtDepth(COLLAPSE.minBestDepth) + ' and ' + fmt(COLLAPSE.minGold) + ' Gold earned.',
        'It resets: ' + resets.join(', ') + '. You keep: ' + keeps.join(', ') + '.',
        'You get Core Dust. Each piece of Core Dust adds ' + dust + '% to all the Gold you earn.',
      ],
    },
    { id: 'words', title: 'Words to know', lines: WORD_IDS.map((id) => HELP[id].text) },
  ];
}
