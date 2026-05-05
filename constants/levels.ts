export const LEVELS: { level: number; name: string; minXp: number }[] = [
  { level: 1, name: 'just started', minXp: 0 },
  { level: 2, name: 'getting cozy', minXp: 100 },
  { level: 3, name: 'dynamic duo', minXp: 300 },
  { level: 4, name: 'power couple', minXp: 700 },
  { level: 5, name: 'unstoppable', minXp: 1500 },
  { level: 6, name: 'legends', minXp: 3000 },
  { level: 7, name: 'hall of fame', minXp: 5000 },
];

export const XP_REWARDS = {
  nomination_added: 10,
  decision_made: 5,
  deliberation_picks_submitted: 30,
  contested_category_resolved: 20,
  ceremony_completed: 200,
  daily_checkin: 2,
  weekly_challenge_completed: 50,
  first_nomination_in_category: 15,
  /** Reasons: each reason you save for your partner */
  reason_written: 10,
  /** First reason of a local day that bumps the couple’s reasons streak — both partners */
  reason_streak_day: 2,
  /** Mood: first log of the local day per user. */
  mood_first_log_today: 2,
  /** Mood: both partners logged today (granted to both, once per dayKey). */
  mood_in_sync_today: 3,
  /** Mood: both partners picked the same sticker today (stacks with in_sync). */
  mood_match_today: 2,
  /** Habits v2: you checked your side of a shared daily */
  habit_self_daily: 3,
  /** Habits v2: a shared daily row became both-done today */
  habit_joint_daily: 5,
  /** Habits v2: you completed your side of a shared weekly (once per week) */
  habit_self_weekly: 5,
  /** Habits v2: a shared weekly row became both-done for the week */
  habit_joint_weekly: 8,
  /** Daily streak crossed 7 / 14 / 30 / 60 / 90 (personal or joint ladder in trigger) */
  habit_streak_milestone: 15,
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
