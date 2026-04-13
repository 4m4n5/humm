import type { Couple, CoupleStreaksState } from '@/types';

export const DEFAULT_STREAKS: CoupleStreaksState = {
  decisionStreak: 0,
  nominationStreak: 0,
  ceremonyStreak: 0,
  reasonStreak: 0,
  lastDecisionDayKey: null,
  lastNominationDayKey: null,
  lastCeremonyCompleteDayKey: null,
  lastReasonDayKey: null,
};

export function mergeCoupleGamificationDefaults(raw: Couple | null): Couple | null {
  if (!raw) return null;
  return {
    ...raw,
    streaks: { ...DEFAULT_STREAKS, ...raw.streaks },
    weeklyChallenge: raw.weeklyChallenge ?? null,
  };
}
