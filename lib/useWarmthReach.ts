import { useMemo } from 'react';
import { useHabitStore } from '@/lib/stores/habitStore';

/**
 * Computes a dynamic `reach` value (0.35 – 0.55) for `AmbientGlow` based on
 * the couple's engagement streaks. The glow gets warmer as the relationship
 * grows — applied uniformly across every screen via `AmbientGlow`.
 *
 * Only three streak types contribute. Weights are **inverse** of how likely
 * the action is — rarer actions are more valuable:
 *
 *   reason streak  × 3.0   (rarest — writing reasons takes effort)
 *   habit streak   × 2.0   (moderate — daily but requires consistency)
 *   mood streak    × 1.0   (most frequent — easy two-tap log)
 *
 * Even a 1-day mood streak is 1 pt → +0.02 reach. A 2-day reason streak
 * is 6 pts → +0.10 reach. The curve is gradual but each action produces
 * a visible change.
 */
export function useWarmthReach(): number {
  const reasonStreak = useHabitStore((s) => s.couple?.streaks?.reasonStreak ?? 0);
  const jointStreak = useHabitStore((s) => s.couple?.jointDailyStreak ?? 0);
  const moodStreak = useHabitStore((s) => s.couple?.bothLoggedDayStreak ?? 0);

  return useMemo(() => {
    const weighted =
      reasonStreak * 3.0 +
      jointStreak * 2.0 +
      moodStreak * 1.0;

    // 0 → 0.35 (base), 10 weighted pts → 0.55 (cap)
    return Math.min(0.55, 0.35 + weighted * 0.02);
  }, [reasonStreak, jointStreak, moodStreak]);
}
