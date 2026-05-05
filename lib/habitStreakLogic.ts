import type { Habit, HabitCheckin } from '@/types';
import { localDayKey, localWeekKey, previousLocalDayKey } from '@/lib/dateKeys';

/** Lookup key for daily check-ins in a Set. */
export function dailyCheckinKey(habitId: string, uid: string, dayKey: string): string {
  return `d|${habitId}|${uid}|${dayKey}`;
}

/** Lookup key for weekly check-ins in a Set. */
export function weeklyCheckinKey(habitId: string, uid: string, weekKey: string): string {
  return `w|${habitId}|${uid}|${weekKey}`;
}

/** Index all check-ins (daily + weekly) for streak and completion checks. */
export function indexHabitCheckins(checkins: HabitCheckin[]): Set<string> {
  const s = new Set<string>();
  for (const c of checkins) {
    if (c.cadence === 'weekly' && c.weekKey) {
      s.add(weeklyCheckinKey(c.habitId, c.uid, c.weekKey));
    } else if (c.cadence === 'daily' && c.dayKey) {
      s.add(dailyCheckinKey(c.habitId, c.uid, c.dayKey));
    }
  }
  return s;
}

export function activeDailyHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => !h.archived && h.cadence === 'daily');
}

export function activeWeeklyHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => !h.archived && h.cadence === 'weekly');
}

/** User must check this daily habit today (their column). */
export function userOwesDailyHabit(h: Habit, uid: string): boolean {
  if (h.cadence !== 'daily' || h.archived) return false;
  if (h.scope === 'shared') return true;
  return h.scope === 'personal' && h.createdBy === uid;
}

export function hasDailyCheckin(keys: Set<string>, habitId: string, uid: string, dayKey: string): boolean {
  return keys.has(dailyCheckinKey(habitId, uid, dayKey));
}

export function hasWeeklyCheckin(keys: Set<string>, habitId: string, uid: string, weekKey: string): boolean {
  return keys.has(weeklyCheckinKey(habitId, uid, weekKey));
}

/** All daily habits this user owes today have a check-in for `dayKey`. */
export function userCompletedAllDailiesOwedToday(
  habits: Habit[],
  uid: string,
  dayKey: string,
  keys: Set<string>,
): boolean {
  const owed = activeDailyHabits(habits).filter((h) => userOwesDailyHabit(h, uid));
  if (owed.length === 0) return false;
  return owed.every((h) => hasDailyCheckin(keys, h.id, uid, dayKey));
}

/** Every shared daily habit has both partners checked for `dayKey`. */
export function jointSharedDailiesBothDoneOnDay(
  habits: Habit[],
  uidA: string,
  uidB: string,
  dayKey: string,
  keys: Set<string>,
): boolean {
  const shared = activeDailyHabits(habits).filter((h) => h.scope === 'shared');
  if (shared.length === 0) return false;
  return shared.every(
    (h) => hasDailyCheckin(keys, h.id, uidA, dayKey) && hasDailyCheckin(keys, h.id, uidB, dayKey),
  );
}

export function mostRecentUserAllDoneDayKey(
  habits: Habit[],
  uid: string,
  fromDayKey: string,
  keys: Set<string>,
  maxDays = 400,
): string | null {
  let d = fromDayKey;
  for (let i = 0; i < maxDays; i++) {
    if (userCompletedAllDailiesOwedToday(habits, uid, d, keys)) return d;
    d = previousLocalDayKey(d);
  }
  return null;
}

export function mostRecentJointDailyDayKey(
  habits: Habit[],
  uidA: string,
  uidB: string,
  fromDayKey: string,
  keys: Set<string>,
  maxDays = 400,
): string | null {
  let d = fromDayKey;
  for (let i = 0; i < maxDays; i++) {
    if (jointSharedDailiesBothDoneOnDay(habits, uidA, uidB, d, keys)) return d;
    d = previousLocalDayKey(d);
  }
  return null;
}

export function computeUserDailyStreak(
  habits: Habit[],
  uid: string,
  endDayKey: string,
  keys: Set<string>,
  maxDays = 400,
): number {
  let streak = 0;
  let d = endDayKey;
  for (let i = 0; i < maxDays; i++) {
    if (userCompletedAllDailiesOwedToday(habits, uid, d, keys)) {
      streak += 1;
      d = previousLocalDayKey(d);
    } else {
      break;
    }
  }
  return streak;
}

export function computeJointDailyStreak(
  habits: Habit[],
  uidA: string,
  uidB: string,
  endDayKey: string,
  keys: Set<string>,
  maxDays = 400,
): number {
  let streak = 0;
  let d = endDayKey;
  for (let i = 0; i < maxDays; i++) {
    if (jointSharedDailiesBothDoneOnDay(habits, uidA, uidB, d, keys)) {
      streak += 1;
      d = previousLocalDayKey(d);
    } else {
      break;
    }
  }
  return streak;
}

/** Weekly habit is in effect for `weekKey` (Monday key). */
export function weeklyHabitIsActiveForWeek(h: Habit, weekKey: string): boolean {
  if (h.cadence !== 'weekly' || h.archived) return false;
  const start = h.weeklyStartWeekKey;
  if (!start) return true;
  return weekKey >= start;
}

/** Shared weekly: both checked for `weekKey`. */
export function jointSharedWeeklyBothDone(
  habits: Habit[],
  uidA: string,
  uidB: string,
  weekKey: string,
  keys: Set<string>,
): boolean {
  const shared = activeWeeklyHabits(habits).filter(
    (h) => h.scope === 'shared' && weeklyHabitIsActiveForWeek(h, weekKey),
  );
  if (shared.length === 0) return false;
  return shared.every(
    (h) => hasWeeklyCheckin(keys, h.id, uidA, weekKey) && hasWeeklyCheckin(keys, h.id, uidB, weekKey),
  );
}

/** User completed their weekly obligation (shared + personal weeklies active this week). */
export function userCompletedAllWeekliesOwedForWeek(
  habits: Habit[],
  uid: string,
  weekKey: string,
  keys: Set<string>,
): boolean {
  const weeklies = activeWeeklyHabits(habits).filter((h) => weeklyHabitIsActiveForWeek(h, weekKey));
  const owed = weeklies.filter((h) => {
    if (h.scope === 'shared') return true;
    return h.scope === 'personal' && h.createdBy === uid;
  });
  if (owed.length === 0) return false;
  return owed.every((h) => hasWeeklyCheckin(keys, h.id, uid, weekKey));
}
