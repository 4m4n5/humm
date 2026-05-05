/**
 * Level curve and XP grant amounts.
 *
 * Design goal: every feature (mood / decide / habits / reasons / awards) earns at a
 * comparable cadence so no single loop dominates progression. Daily anchors are small,
 * weekly accomplishments are mid, and the seasonal ceremony is the largest single grant
 * but no longer an outlier (was 200, now 120). Streak milestones grant the same flat
 * 15 XP regardless of which feature reached a threshold.
 *
 * Anti-farming: actions that fire on every save (mood in_sync / match) are deduped at
 * the couple level by dayKey in the trigger, not here. Bulk-spammable actions
 * (reasons / decisions / nominations) keep their per-action grant; per-day caps live in
 * the triggers when added.
 */
export const LEVELS: { level: number; name: string; minXp: number }[] = [
  { level: 1, name: 'just started', minXp: 0 },
  { level: 2, name: 'getting cozy', minXp: 80 },
  { level: 3, name: 'dynamic duo', minXp: 220 },
  { level: 4, name: 'power couple', minXp: 500 },
  { level: 5, name: 'unstoppable', minXp: 1000 },
  { level: 6, name: 'legends', minXp: 1900 },
  { level: 7, name: 'hall of fame', minXp: 3200 },
  { level: 8, name: 'constellation', minXp: 5000 },
  { level: 9, name: 'eternal couple', minXp: 7500 },
];

export const XP_REWARDS = {
  // Awards
  nomination_added: 8,
  first_nomination_in_category: 12,
  deliberation_picks_submitted: 25,
  contested_category_resolved: 18,
  ceremony_completed: 120,

  // Decide
  decision_made: 4,
  /** Granted to both when the couple decision streak advances on a new day. */
  daily_checkin: 3,
  /** Decision streak crossed 7 / 14 / 30 / 60 / 90. Granted to both. */
  decision_streak_milestone: 15,

  // Reasons
  reason_written: 8,
  reason_streak_day: 3,
  /** Reason streak crossed 7 / 14 / 30 / 60 / 90. Granted to both. */
  reason_streak_milestone: 15,

  // Mood
  /** First Firestore create of the day per user. Once per user per local day. */
  mood_first_log_today: 4,
  /** Both partners have an entry for today. Once per couple per local day. */
  mood_in_sync_today: 6,
  /** Both partners have the same sticker today. Once per couple per local day. */
  mood_match_today: 4,
  /** bothLoggedDayStreak crossed 7 / 14 / 30 / 60 / 90. Granted to both. */
  mood_streak_milestone: 15,

  // Habits — shared
  habit_self_daily: 3,
  habit_joint_daily: 5,
  habit_self_weekly: 5,
  habit_joint_weekly: 8,
  habit_streak_milestone: 15,
  // Habits — personal (smaller but real, so personal habits aren't a dead loop)
  habit_self_personal_daily: 2,
  habit_self_personal_weekly: 3,

  // Cross-feature
  weekly_challenge_completed: 40,
} as const;

export function getLevelForXp(xp: number): { level: number; name: string; minXp: number; nextLevelXp: number | null } {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
  }
  const nextIndex = LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = LEVELS[nextIndex] ?? null;
  return { ...current, nextLevelXp: next?.minXp ?? null };
}
