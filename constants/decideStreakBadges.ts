/**
 * Decide streak ladder — couple-shared `decisionStreak` thresholds. Brings Decide
 * to feature parity with Habits/Mood/Reasons, all of which now reward streak depth.
 */

export type DecideStreakTierMeta = {
  days: number;
  id: string;
  name: string;
  description: string;
  emoji: string;
};

export const DECIDE_STREAK_TIERS: DecideStreakTierMeta[] = [
  { days: 7, id: 'decide_streak_7', name: 'decisive week', description: '7-day decision streak', emoji: '🎯' },
  { days: 14, id: 'decide_streak_14', name: 'fortnight in motion', description: '14-day decision streak', emoji: '🧭' },
  { days: 30, id: 'decide_streak_30', name: 'decisive month', description: '30-day decision streak', emoji: '⚙️' },
  { days: 60, id: 'decide_streak_60', name: 'two-month motor', description: '60-day decision streak', emoji: '🚀' },
];
