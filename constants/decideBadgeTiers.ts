/**
 * Decide / Quick Spin — lighter ladder than Awards & Reasons; still covers the tab with room to grow.
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

const SPIN = expandingTotals(4, 14, 5);
export const QUICKSPIN_COUPLE_TIERS: DecideTierMeta[] = [
  {
    count: SPIN[0]!,
    id: `spin_chain_${SPIN[0]}`,
    name: 'spin rhythm',
    description: '4 quick spins saved as a pair',
    emoji: '🎰',
  },
  {
    count: SPIN[1]!,
    id: `spin_chain_${SPIN[1]}`,
    name: 'spin streak',
    description: '9 quick spins in the log',
    emoji: '💫',
  },
  {
    count: SPIN[2]!,
    id: `spin_chain_${SPIN[2]}`,
    name: 'spin ritual',
    description: '15 spins — this is a thing for you two',
    emoji: '🔁',
  },
  {
    count: SPIN[3]!,
    id: `spin_chain_${SPIN[3]}`,
    name: 'spin devotion',
    description: '22 quick spins together',
    emoji: '✨',
  },
  {
    count: SPIN[4]!,
    id: `spin_chain_${SPIN[4]}`,
    name: 'spin library',
    description: '30 spins saved — serious decide energy',
    emoji: '📚',
  },
];

/** All decisions (quick spin + battle) — couple; `decisive` at 100 stays separate */
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
