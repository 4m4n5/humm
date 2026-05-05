/**
 * Weekly challenge badges — rewards for the cumulative count of weekly challenges
 * the couple has cleared. Until now weekly challenges only granted XP; this gives
 * them a permanent progression surface like every other feature has.
 */

export type WeeklyChallengeTierMeta = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  count: number;
};

export const WEEKLY_CHALLENGE_TIERS: WeeklyChallengeTierMeta[] = [
  { count: 1, id: 'weekly_first', name: 'first weekly', description: 'cleared your first weekly challenge', emoji: '🌟' },
  { count: 5, id: 'weekly_5', name: 'high five', description: '5 weekly challenges cleared', emoji: '🙌' },
  { count: 12, id: 'weekly_12', name: 'season streak', description: '12 weekly challenges in the books', emoji: '📅' },
  { count: 26, id: 'weekly_26', name: 'half year', description: '26 weeks of challenges cleared', emoji: '🗓️' },
  { count: 52, id: 'weekly_52', name: 'full year', description: 'a full year of weekly wins', emoji: '🏅' },
];

/** Reasons streak milestone badges (long-streak rewards beyond the existing ladder is fine; this hooks the streak-milestone XP). */
