// Goal templates for each drop. Targets scale with the player's best depth,
// so a goal is always possible but never too easy. Rewards are shards.

export const MAX_GOALS = 3;
export const GOAL_SHARD_CAP = 12; // goals can never pay more than this per drop

function roundTo(n, step) {
  return Math.max(step, Math.round(n / step) * step);
}

function safeBest(best) {
  const b = Number(best);
  return Number.isFinite(b) && b > 0 ? b : 0;
}

// Highest gem tier we ask for, based on how deep the player has been.
function tierFor(best) {
  if (best < 100) return 1;
  if (best < 250) return 2;
  if (best < 450) return 3;
  if (best < 700) return 4;
  return 5;
}

// Each template builds a goal from the best depth and a level (0 easy, 1 normal, 2 hard).
export const TEMPLATES = [
  {
    kind: 'depth', minBest: 0,
    make(best, level) {
      const mult = [0.6, 0.9, 1.1][level];
      const target = roundTo(Math.max(30, best * mult), 10);
      return { target, text: `Reach ${target} m`, reward: 1 + level };
    },
  },
  {
    kind: 'gems', minBest: 0,
    make(best, level) {
      const tier = tierFor(best);
      const target = [5, 10, 18][level] + Math.floor(best / 100) * 2;
      const label = tier > 1 ? ` of tier ${tier} or better` : '';
      return { target, tier, text: `Collect ${target} gems${label}`, reward: 1 + level };
    },
  },
  {
    kind: 'combo', minBest: 0,
    make(best, level) {
      const target = Math.min(40, [3, 5, 8][level] + Math.floor(best / 150));
      return { target, text: `Reach a Combo of ${target}`, reward: 1 + level };
    },
  },
  {
    kind: 'haulStrain', minBest: 60,
    make(best, level) {
      const strainBelow = [70, 55, 40][level];
      const minDepth = roundTo(best * [0.4, 0.5, 0.6][level], 10);
      return { target: minDepth, strainBelow, text: `Haul with Strain under ${strainBelow} after ${minDepth} m`, reward: 2 + level };
    },
  },
  {
    kind: 'cleanRope', minBest: 150,
    make(best, level) {
      const maxHits = [4, 3, 2][level];
      const target = roundTo(best * [0.4, 0.5, 0.6][level], 10);
      return { target, maxHits, text: `Reach ${target} m with at most ${maxHits} hazard hits`, reward: 2 + level };
    },
  },
];

export function availableTemplates(bestDepth) {
  const best = safeBest(bestDepth);
  return TEMPLATES.filter((t) => best >= t.minBest);
}

export const goalData = { TEMPLATES, MAX_GOALS, GOAL_SHARD_CAP, availableTemplates };
export default goalData;
