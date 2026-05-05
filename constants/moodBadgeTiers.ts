/**
 * Mood badge ladders. Mirrors the cadence used by Awards / Reasons so mood feels
 * like a first-class progression surface, not an afterthought.
 *
 * - Personal mood-pulse tiers: total entries the acting user has logged (any quadrant).
 * - Couple devotion tiers: bothLoggedDayStreak crossed.
 * - Couple twin tiers: distinct days both partners picked the same sticker.
 */

export type MoodTierMeta = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  count: number;
};

/** Per user — total mood entries. */
export const MOOD_PULSE_TIERS: MoodTierMeta[] = [
  { count: 7, id: 'mood_pulse_7', name: 'first pulse', description: '7 mood entries on the books', emoji: '🌷' },
  { count: 21, id: 'mood_pulse_21', name: 'rolling pulse', description: '21 mood entries — finding the rhythm', emoji: '🌿' },
  { count: 60, id: 'mood_pulse_60', name: 'daily pulse', description: '60 mood entries — pulse-keeper', emoji: '🌻' },
  { count: 150, id: 'mood_pulse_150', name: 'mood archive', description: '150 mood entries — full archive', emoji: '🌌' },
];

/** Couple — bothLoggedDayStreak thresholds. Wider than Reasons since mood is daily-only. */
export const MOOD_DEVOTION_STREAK_TIERS: { days: number; id: string; name: string; description: string; emoji: string }[] = [
  { days: 7, id: 'mood_devotion_7', name: 'mood week', description: '7 days you both logged a mood', emoji: '🎶' },
  { days: 21, id: 'mood_devotion_21', name: 'mood fortnight+', description: '21-day devotion streak', emoji: '🌗' },
  { days: 45, id: 'mood_devotion_45', name: 'mood season', description: '45 days you both logged', emoji: '🌅' },
  { days: 90, id: 'mood_devotion_90', name: 'mood quarter', description: '90 days of synced mood logs', emoji: '🪐' },
];

/** Couple — distinct days both picked the same sticker. */
export const MOOD_TWIN_DAY_TIERS: MoodTierMeta[] = [
  { count: 5, id: 'mood_twin_days_5', name: 'twin pulse', description: '5 days you both picked the same mood', emoji: '👯' },
  { count: 15, id: 'mood_twin_days_15', name: 'twin run', description: '15 same-mood days', emoji: '🪞' },
  { count: 40, id: 'mood_twin_days_40', name: 'twin tide', description: '40 same-mood days — uncanny sync', emoji: '🌊' },
];
