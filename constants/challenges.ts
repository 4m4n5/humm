import type { WeeklyChallengeKind } from '@/types';

export type ChallengePoolEntry = {
  id: string;
  description: string;
  kind: WeeklyChallengeKind;
};

/** One line per kind — week hash still picks among copy variants via rotation. */
export const WEEKLY_CHALLENGE_POOL: ChallengePoolEntry[] = [
  {
    id: 'nom',
    description: 'you both add at least one nomination this week',
    kind: 'both_nomination',
  },
  {
    id: 'spin',
    description: 'you both save a quick spin this week',
    kind: 'both_quickspin',
  },
  {
    id: 'reason',
    description: 'you both write a reason this week',
    kind: 'both_reason',
  },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickChallengeForWeek(weekKey: string): ChallengePoolEntry {
  return WEEKLY_CHALLENGE_POOL[hashString(weekKey) % WEEKLY_CHALLENGE_POOL.length]!;
}
