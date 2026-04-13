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
