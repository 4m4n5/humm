/**
 * Decide / Pick Together — lighter ladder than Awards & Reasons; still covers the tab with room to grow.
 */

function expandingTotals(firstGap: number, maxGap: number, tierCount: number): number[] {
  const out: number[] = [];
  let sum = 0;
  let gap = firstGap;
  for (let i = 0; i < tierCount; i++) {
    sum += gap;
    out.push(sum);
    gap = Math.min(maxGap, gap + 1);
  }
  return out;
}

export type DecideTierMeta = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  count: number;
};

const SOLO = expandingTotals(4, 14, 5);
export const QUICKSPIN_COUPLE_TIERS: DecideTierMeta[] = [
  {
    count: SOLO[0]!,
    id: `spin_chain_${SOLO[0]}`,
    name: 'pick rhythm',
    description: '4 randomized decisions saved',
    emoji: '✨',
  },
  {
    count: SOLO[1]!,
    id: `spin_chain_${SOLO[1]}`,
    name: 'pick streak',
    description: '9 randomized decisions in the log',
    emoji: '💫',
  },
  {
    count: SOLO[2]!,
    id: `spin_chain_${SOLO[2]}`,
    name: 'pick ritual',
    description: '15 randomized \u2014 this is a thing for you two',
    emoji: '🔁',
  },
  {
    count: SOLO[3]!,
    id: `spin_chain_${SOLO[3]}`,
    name: 'pick devotion',
    description: '22 randomized decisions together',
    emoji: '✨',
  },
  {
    count: SOLO[4]!,
    id: `spin_chain_${SOLO[4]}`,
    name: 'pick library',
    description: '30 randomized \u2014 serious decide energy',
    emoji: '📚',
  },
];

/** All decisions (quick + live) — couple; `decisive` at 100 stays separate */
export const ALL_DECISIONS_COUPLE_TIERS: DecideTierMeta[] = [
  {
    count: 12,
    id: 'decide_depth_12',
    name: 'twelve calls',
    description: '12 decisions made together',
    emoji: '📍',
  },
  {
    count: 25,
    id: 'decide_depth_25',
    name: 'twenty-five saves',
    description: '25 calls in the books',
    emoji: '🔀',
  },
  {
    count: 39,
    id: 'decide_depth_39',
    name: 'thirty-nine picks',
    description: '39 saves — you decide often',
    emoji: '🧭',
  },
  {
    count: 54,
    id: 'decide_depth_54',
    name: 'fifty-four calls',
    description: '54 decisions together',
    emoji: '⚡',
  },
];
