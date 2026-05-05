import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Couple, CoupleDailyStreakRow, Habit, HabitCheckin } from '@/types';
import { coupleDoc } from '@/lib/firestore/couples';
import { localDayKey, nextLocalMondayWeekKey } from '@/lib/dateKeys';
import {
  computeJointDailyStreak,
  computeUserDailyStreak,
  indexHabitCheckins,
  mostRecentJointDailyDayKey,
  mostRecentUserAllDoneDayKey,
} from '@/lib/habitStreakLogic';

/**
 * Partner habits v2: `habits` + `habitCheckins` collections, plus streak aggregates on `couples`.
 * Security: merge `firestore.habits.rules`. Indexes: see `firestore.indexes.json` (habitCheckins by coupleId/cadence/dayKey, etc.).
 */

export const habitsCol = () => collection(db, 'habits');
export const habitCheckinsCol = () => collection(db, 'habitCheckins');

export function dailyCheckinDocId(habitId: string, uid: string, dayKey: string): string {
  return `${habitId}_${uid}_${dayKey}`;
}

export function weeklyCheckinDocId(habitId: string, uid: string, weekKey: string): string {
  return `${habitId}_${uid}_wk_${weekKey}`;
}

function createdAtMs(h: Habit): number {
  const t = h.createdAt;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  return 0;
}

export function subscribeToHabits(coupleId: string, callback: (items: Habit[]) => void) {
  const q = query(habitsCol(), where('coupleId', '==', coupleId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as Habit).filter((h) => !h.archived);
      items.sort((a, b) => createdAtMs(a) - createdAtMs(b));
      callback(items);
    },
    (err) => {
      console.warn('[habits] subscribeToHabits', err.code, err.message);
      callback([]);
    },
  );
}

export function subscribeToCheckinsForDay(
  coupleId: string,
  dayKey: string,
  callback: (items: HabitCheckin[]) => void,
) {
  const q = query(
    habitCheckinsCol(),
    where('coupleId', '==', coupleId),
    where('cadence', '==', 'daily'),
    where('dayKey', '==', dayKey),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as HabitCheckin));
    },
    (err) => {
      console.warn('[habits] subscribeToCheckinsForDay', err.code, err.message);
      callback([]);
    },
  );
}

export function subscribeToCheckinsForWeek(
  coupleId: string,
  weekKey: string,
  callback: (items: HabitCheckin[]) => void,
) {
  const q = query(
    habitCheckinsCol(),
    where('coupleId', '==', coupleId),
    where('cadence', '==', 'weekly'),
    where('weekKey', '==', weekKey),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as HabitCheckin));
    },
    (err) => {
      console.warn('[habits] subscribeToCheckinsForWeek', err.code, err.message);
      callback([]);
    },
  );
}

export function subscribeToCheckinsInDayKeyRange(
  coupleId: string,
  minDayKey: string,
  maxDayKey: string,
  callback: (items: HabitCheckin[]) => void,
) {
  const q = query(
    habitCheckinsCol(),
    where('coupleId', '==', coupleId),
    where('cadence', '==', 'daily'),
    where('dayKey', '>=', minDayKey),
    where('dayKey', '<=', maxDayKey),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as HabitCheckin));
    },
    (err) => {
      console.warn('[habits] subscribeToCheckinsInDayKeyRange', err.code, err.message);
      callback([]);
    },
  );
}

export async function fetchActiveHabitsForCouple(coupleId: string): Promise<Habit[]> {
  const q = query(habitsCol(), where('coupleId', '==', coupleId), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Habit).filter((h) => !h.archived);
}

export async function fetchAllHabitsForCoupleIncludingArchived(coupleId: string): Promise<Habit[]> {
  const q = query(habitsCol(), where('coupleId', '==', coupleId), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => d.data() as Habit);
  items.sort((a, b) => createdAtMs(a) - createdAtMs(b));
  return items;
}

export async function fetchCheckinsInDayKeyRange(
  coupleId: string,
  minDayKey: string,
  maxDayKey: string,
): Promise<HabitCheckin[]> {
  const q = query(
    habitCheckinsCol(),
    where('coupleId', '==', coupleId),
    where('cadence', '==', 'daily'),
    where('dayKey', '>=', minDayKey),
    where('dayKey', '<=', maxDayKey),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as HabitCheckin);
}

export async function fetchWeeklyCheckinsForWeek(
  coupleId: string,
  weekKey: string,
): Promise<HabitCheckin[]> {
  const q = query(
    habitCheckinsCol(),
    where('coupleId', '==', coupleId),
    where('cadence', '==', 'weekly'),
    where('weekKey', '==', weekKey),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as HabitCheckin);
}

export async function deleteAllCheckinsForHabit(habitId: string): Promise<void> {
  for (;;) {
    const snap = await getDocs(query(habitCheckinsCol(), where('habitId', '==', habitId)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    const slice = snap.docs.slice(0, 450);
    for (const d of slice) batch.delete(d.ref);
    await batch.commit();
    if (slice.length < 450) break;
  }
}

export type CreateHabitInput = {
  coupleId: string;
  createdBy: string;
  title: string;
  emoji: string;
  cadence: Habit['cadence'];
  scope: Habit['scope'];
};

export async function createHabit(data: CreateHabitInput): Promise<string> {
  const ref = doc(habitsCol());
  const payload: Record<string, unknown> = {
    id: ref.id,
    coupleId: data.coupleId,
    createdBy: data.createdBy,
    title: data.title.trim(),
    emoji: data.emoji.trim() || '✨',
    cadence: data.cadence,
    scope: data.scope,
    archived: false,
    createdAt: serverTimestamp(),
  };
  if (data.cadence === 'weekly') {
    payload.weeklyStartWeekKey = nextLocalMondayWeekKey(new Date());
  }
  await setDoc(ref, payload);
  return ref.id;
}

/** Any edit clears this habit's check-ins so couple streaks recompute without old data. */
export async function updateHabit(
  habitId: string,
  patch: Partial<Pick<Habit, 'title' | 'emoji' | 'cadence' | 'scope' | 'weeklyStartWeekKey'>>,
): Promise<void> {
  const ref = doc(habitsCol(), habitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const prev = snap.data() as Habit;
  await deleteAllCheckinsForHabit(habitId);
  const nextCadence = patch.cadence ?? prev.cadence;
  const extra: Record<string, unknown> = { ...patch };
  if (nextCadence === 'weekly' && prev.cadence !== 'weekly' && patch.weeklyStartWeekKey === undefined) {
    extra.weeklyStartWeekKey = nextLocalMondayWeekKey(new Date());
  }
  if (nextCadence === 'daily') {
    extra.weeklyStartWeekKey = deleteField();
  }
  extra.lastJointDailyBonusDayKey = deleteField();
  extra.lastSelfDailyXpByUid = deleteField();
  extra.lastJointWeeklyBonusWeekKey = deleteField();
  extra.lastSelfWeeklyXpByUid = deleteField();
  await updateDoc(ref, extra);
}

export async function archiveHabit(habitId: string): Promise<void> {
  await updateDoc(doc(habitsCol(), habitId), { archived: true });
}

export async function toggleDailyCheckin(
  habitId: string,
  coupleId: string,
  uid: string,
  dayKey = localDayKey(),
): Promise<'added' | 'removed'> {
  const id = dailyCheckinDocId(habitId, uid, dayKey);
  const cref = doc(habitCheckinsCol(), id);
  const snap = await getDoc(cref);
  if (snap.exists()) {
    await deleteDoc(cref);
    return 'removed';
  }
  await setDoc(cref, {
    id,
    habitId,
    coupleId,
    uid,
    cadence: 'daily' as const,
    dayKey,
    createdAt: serverTimestamp(),
  });
  return 'added';
}

export async function toggleWeeklyCheckin(
  habitId: string,
  coupleId: string,
  uid: string,
  weekKey: string,
): Promise<'added' | 'removed'> {
  const id = weeklyCheckinDocId(habitId, uid, weekKey);
  const cref = doc(habitCheckinsCol(), id);
  const snap = await getDoc(cref);
  if (snap.exists()) {
    await deleteDoc(cref);
    return 'removed';
  }
  await setDoc(cref, {
    id,
    habitId,
    coupleId,
    uid,
    cadence: 'weekly' as const,
    weekKey,
    createdAt: serverTimestamp(),
  });
  return 'added';
}

export async function recomputeAndPersistDailyStreaks(
  coupleId: string,
  habits: Habit[],
  dailyCheckins: HabitCheckin[],
  uidA: string,
  uidB: string,
  todayKey = localDayKey(),
): Promise<void> {
  const keys = indexHabitCheckins(dailyCheckins);
  const curA = computeUserDailyStreak(habits, uidA, todayKey, keys);
  const curB = computeUserDailyStreak(habits, uidB, todayKey, keys);
  const joint = computeJointDailyStreak(habits, uidA, uidB, todayKey, keys);

  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as Couple;
  const prev = c.dailyStreaks ?? {};

  const row = (uid: string, current: number): CoupleDailyStreakRow => {
    const prevRow = prev[uid];
    const longest = Math.max(prevRow?.longestStreak ?? 0, current);
    return {
      currentStreak: current,
      longestStreak: longest,
      lastCompletedDayKey: mostRecentUserAllDoneDayKey(habits, uid, todayKey, keys),
    };
  };

  await updateDoc(ref, {
    dailyStreaks: {
      ...prev,
      [uidA]: row(uidA, curA),
      [uidB]: row(uidB, curB),
    },
    jointDailyStreak: joint,
    lastJointDailyDayKey: mostRecentJointDailyDayKey(habits, uidA, uidB, todayKey, keys),
  });
}
