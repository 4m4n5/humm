import { getCouple } from '@/lib/firestore/couples';
import { grantXp, type GrantXpResult } from '@/lib/firestore/gamification';
import { XP_REWARDS } from '@/constants/levels';
import {
  updateCoupleStreakAfterDecision,
  updateCoupleStreakAfterNomination,
  updateCoupleStreakAfterReason,
  updateCoupleStreakAfterCeremonyComplete,
  recordWeeklyChallengeProgress,
  recordHabitWeeklyChallengeJointDay,
} from '@/lib/firestore/coupleGamification';
import {
  evaluateDecisionCoupleBadges,
  evaluateNominationCoupleBadges,
  evaluateReasonsCoupleBadges,
  evaluateReasonAuthorBadges,
  evaluateCeremonyCompleteBadges,
  evaluateNewMoodBadges,
  evaluateFirstHabitBadge,
  evaluateFirstCheckinBadge,
  evaluateHabitStreakBadges,
  evaluateHabitDepthBadges,
} from '@/lib/gamificationBadges';
import { localDayKey, localWeekKey, offsetLocalDayKey } from '@/lib/dateKeys';
import type { Ceremony, Couple, Habit, HabitCheckin, MoodEntry, Nomination, UserProfile } from '@/types';
import { doc, getCountFromServer, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { userDoc } from '@/lib/firestore/users';
import { isUserAuthoredNomination } from '@/lib/nominationSeeded';
import { nominationsCol } from '@/lib/firestore/nominations';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { coupleDoc } from '@/lib/firestore/couples';
import {
  fetchActiveHabitsForCouple,
  fetchAllHabitsForCoupleIncludingArchived,
  fetchCheckinsInDayKeyRange,
  fetchWeeklyCheckinsForWeek,
  habitCheckinsCol,
  habitsCol,
  recomputeAndPersistDailyStreaks,
} from '@/lib/firestore/habits';
import {
  indexHabitCheckins,
  jointSharedDailiesBothDoneOnDay,
  hasDailyCheckin,
  hasWeeklyCheckin,
} from '@/lib/habitStreakLogic';

async function couplePair(coupleId: string): Promise<{ uidA: string; uidB: string } | null> {
  const c = await getCouple(coupleId);
  if (!c) return null;
  return { uidA: c.user1Id, uidB: c.user2Id };
}

async function grantXpSafe(uid: string, amount: number): Promise<GrantXpResult | null> {
  try {
    return await grantXp(uid, amount);
  } catch (e) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
    if (code === 'permission-denied') {
      console.warn(
        '[gamification] grantXp permission denied — ensure `users` rules allow partners to update `xp` + `level` (see Firestore rules):',
        uid,
      );
    } else {
      console.warn('[gamification] grantXp failed:', uid, e);
    }
    return null;
  }
}

/** Quick Spin decision saved (acting user gets decision XP). */
export async function afterQuickSpinDecisionSaved(actingUid: string, coupleId: string): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;
  const xp: (GrantXpResult | null)[] = [];
  xp.push(await grantXp(actingUid, XP_REWARDS.decision_made));

  const streakResult = await updateCoupleStreakAfterDecision(coupleId);
  xp.push(...streakResult.xp);
  await recordWeeklyChallengeProgress(coupleId, 'both_quickspin', actingUid);

  const badgeNew = await evaluateDecisionCoupleBadges(coupleId, pair.uidA, pair.uidB);
  enqueueGamificationToasts(xp, badgeNew);
}

/** Battle decision row written (both already get XP in grantBattleCompletionRewards). */
export async function afterBattleDecisionSaved(coupleId: string): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;
  const streakResult = await updateCoupleStreakAfterDecision(coupleId);
  const badgeNew = await evaluateDecisionCoupleBadges(coupleId, pair.uidA, pair.uidB);
  enqueueGamificationToasts(streakResult.xp, badgeNew);
}

export async function afterNominationSaved(
  actingUid: string,
  coupleId: string,
  ceremony: { id: string; periodEnd: { toMillis: () => number } },
  category: Nomination['category'],
  nominationsIncludingNew: Nomination[],
): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;
  const xp: GrantXpResult[] = [];
  const base = await grantXp(actingUid, XP_REWARDS.nomination_added);
  if (base) xp.push(base);

  const q = query(
    nominationsCol(),
    where('coupleId', '==', coupleId),
    where('ceremonyId', '==', ceremony.id),
    where('category', '==', category),
  );
  const catSnap = await getDocs(q);
  const catCount = catSnap.docs.filter((d) =>
    isUserAuthoredNomination(d.data() as Nomination),
  ).length;
  if (catCount === 1) {
    const bonus = await grantXp(actingUid, XP_REWARDS.first_nomination_in_category);
    if (bonus) xp.push(bonus);
  }

  await updateCoupleStreakAfterNomination(coupleId);
  await recordWeeklyChallengeProgress(coupleId, 'both_nomination', actingUid);

  const badgeNew = await evaluateNominationCoupleBadges(
    coupleId,
    pair.uidA,
    pair.uidB,
    ceremony,
    nominationsIncludingNew,
  );
  enqueueGamificationToasts(xp, badgeNew);
}

export async function afterReasonSaved(actingUid: string, coupleId: string): Promise<void> {
  const xp: GrantXpResult[] = [];
  const r = await grantXp(actingUid, XP_REWARDS.reason_written);
  if (r) xp.push(r);
  const streakResult = await updateCoupleStreakAfterReason(coupleId);
  for (const s of streakResult.xp) {
    if (s) xp.push(s);
  }
  await recordWeeklyChallengeProgress(coupleId, 'both_reason', actingUid);

  const pair = await couplePair(coupleId);
  const badgeNew: string[] = [];
  if (pair) {
    badgeNew.push(...(await evaluateReasonsCoupleBadges(coupleId, pair.uidA, pair.uidB)));
  }
  badgeNew.push(...(await evaluateReasonAuthorBadges(coupleId, actingUid)));
  badgeNew.push(...streakResult.badgeIds);
  enqueueGamificationToasts(xp, badgeNew);
}

export async function afterResolutionCategoryLocked(actingUid: string, coupleId: string): Promise<void> {
  const r = await grantXp(actingUid, XP_REWARDS.contested_category_resolved);
  enqueueGamificationToasts([r], []);
}

/**
 * Mood v2: called after upsertMoodEntry. Grants XP, updates couple streak,
 * records weekly challenge progress, and runs badge evaluator.
 *
 * Anti-farming: in_sync / match XP is granted at most once per couple per local day —
 * mid-day sticker swaps cannot repeat the bonus.
 */
export async function afterMoodEntryWritten(
  actingUid: string,
  coupleId: string,
  dayKey: string,
  newStickerId: string,
  isFirstSaveToday: boolean,
): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;

  const partnerUid = actingUid === pair.uidA ? pair.uidB : pair.uidA;
  const xp: GrantXpResult[] = [];

  if (isFirstSaveToday) {
    const r = await grantXpSafe(actingUid, XP_REWARDS.mood_first_log_today);
    if (r) xp.push(r);
  }

  const { moodEntryDoc } = await import('@/lib/firestore/moodEntries');
  const partnerSnap = await getDoc(moodEntryDoc(coupleId, partnerUid, dayKey));
  const partnerEntry = partnerSnap.exists() ? (partnerSnap.data() as MoodEntry) : null;

  const bothLoggedToday = !!partnerEntry;
  const bothMatchToday = bothLoggedToday && partnerEntry!.current.stickerId === newStickerId;

  // Read couple state once for dedup + streak math.
  const coupleSnap = await getDoc(coupleDoc(coupleId));
  const couple = coupleSnap.exists() ? (coupleSnap.data() as Couple) : null;

  const inSyncAlreadyGranted = couple?.lastMoodInSyncXpDayKey === dayKey;
  const matchAlreadyGranted = couple?.lastMoodMatchXpDayKey === dayKey;

  if (bothLoggedToday && !inSyncAlreadyGranted) {
    const r1 = await grantXpSafe(actingUid, XP_REWARDS.mood_in_sync_today);
    const r2 = await grantXpSafe(partnerUid, XP_REWARDS.mood_in_sync_today);
    if (r1) xp.push(r1);
    if (r2) xp.push(r2);
    try {
      await updateDoc(coupleDoc(coupleId), { lastMoodInSyncXpDayKey: dayKey });
    } catch (e) {
      console.warn('[gamification] mood in_sync dedup write failed:', e);
    }
  }

  if (bothMatchToday && !matchAlreadyGranted) {
    const r1 = await grantXpSafe(actingUid, XP_REWARDS.mood_match_today);
    const r2 = await grantXpSafe(partnerUid, XP_REWARDS.mood_match_today);
    if (r1) xp.push(r1);
    if (r2) xp.push(r2);
    try {
      await updateDoc(coupleDoc(coupleId), { lastMoodMatchXpDayKey: dayKey });
    } catch (e) {
      console.warn('[gamification] mood match dedup write failed:', e);
    }
  }

  let newBothLoggedStreak = couple?.bothLoggedDayStreak ?? 0;
  if (bothLoggedToday) {
    try {
      const { previousLocalDayKey } = await import('@/lib/dateKeys');
      const prevStreakKey = couple?.lastBothLoggedDayKey ?? null;
      const prevStreak = couple?.bothLoggedDayStreak ?? 0;
      const yesterdayKey = previousLocalDayKey(dayKey);
      newBothLoggedStreak = prevStreakKey === yesterdayKey
        ? prevStreak + 1
        : prevStreakKey === dayKey
          ? prevStreak
          : 1;
      await updateDoc(coupleDoc(coupleId), {
        bothLoggedDayStreak: newBothLoggedStreak,
        lastBothLoggedDayKey: dayKey,
      });
    } catch (e) {
      console.warn('[gamification] mood streak update failed:', e);
    }

    // Streak milestone XP — once per threshold crossing for the couple.
    try {
      const { highestMilestoneReached } = await import('@/lib/firestore/coupleGamification');
      const reached = highestMilestoneReached(newBothLoggedStreak);
      const previouslyRewarded = couple?.lastMoodStreakMilestoneRewarded ?? 0;
      if (reached > previouslyRewarded) {
        const r1 = await grantXpSafe(actingUid, XP_REWARDS.mood_streak_milestone);
        const r2 = await grantXpSafe(partnerUid, XP_REWARDS.mood_streak_milestone);
        if (r1) xp.push(r1);
        if (r2) xp.push(r2);
        await updateDoc(coupleDoc(coupleId), { lastMoodStreakMilestoneRewarded: reached });
      }
    } catch (e) {
      console.warn('[gamification] mood streak milestone failed:', e);
    }
  }

  await recordWeeklyChallengeProgress(coupleId, 'both_mood_three_days', actingUid);

  const { moodEntriesCol } = await import('@/lib/firestore/moodEntries');
  const myAllSnap = await getDocs(
    query(moodEntriesCol(), where('coupleId', '==', coupleId), where('uid', '==', actingUid)),
  );
  const isFirstEver = myAllSnap.size <= 1;
  const myTotalEntries = myAllSnap.size;

  const actingQuadrants = new Set<string>();
  for (const d of myAllSnap.docs) {
    actingQuadrants.add((d.data() as MoodEntry).current.quadrant);
  }

  const bothDaysSnap = await getDocs(
    query(moodEntriesCol(), where('coupleId', '==', coupleId), where('uid', '==', partnerUid)),
  );
  const partnerByDay = new Map<string, MoodEntry>();
  for (const d of bothDaysSnap.docs) {
    const e = d.data() as MoodEntry;
    partnerByDay.set(e.dayKey, e);
  }
  const myByDay = new Map<string, MoodEntry>();
  for (const d of myAllSnap.docs) {
    const e = d.data() as MoodEntry;
    myByDay.set(e.dayKey, e);
  }
  let bothLoggedDayCount = 0;
  let twinDayCount = 0;
  for (const [dk, mine] of myByDay) {
    const theirs = partnerByDay.get(dk);
    if (theirs) {
      bothLoggedDayCount++;
      if (theirs.current.stickerId === mine.current.stickerId) twinDayCount++;
    }
  }

  const badgeNew = await evaluateNewMoodBadges(
    actingUid,
    partnerUid,
    isFirstEver,
    bothLoggedToday,
    bothMatchToday,
    actingQuadrants,
    bothLoggedDayCount,
    {
      myTotalEntries,
      twinDayCount,
      bothLoggedStreak: newBothLoggedStreak,
    },
  );

  enqueueGamificationToasts(xp, badgeNew);
}

const HABIT_STREAK_MILESTONES = [7, 14, 30, 60, 90] as const;

export async function afterHabitCreated(actingUid: string, coupleId: string): Promise<void> {
  try {
    const habitsEver = await fetchAllHabitsForCoupleIncludingArchived(coupleId);
    const mineEver = habitsEver.filter((h) => h.createdBy === actingUid).length;
    const badgeNew: string[] = [];
    badgeNew.push(...(await evaluateFirstHabitBadge(actingUid, mineEver === 1)));
    enqueueGamificationToasts([], badgeNew);
  } catch (e) {
    console.warn('[gamification] afterHabitCreated failed', e);
  }
}

export type HabitCheckinContext =
  | { kind: 'daily'; dayKey: string }
  | { kind: 'weekly'; weekKey: string };

function mergedCheckinsForKeys(
  dailyRows: HabitCheckin[],
  weeklyRows: HabitCheckin[],
): HabitCheckin[] {
  return [...dailyRows, ...weeklyRows];
}

function filterOutToggledCheckin(
  rows: HabitCheckin[],
  habit: Habit,
  actingUid: string,
  ctx: HabitCheckinContext,
): HabitCheckin[] {
  if (ctx.kind === 'daily') {
    return rows.filter(
      (c) =>
        !(
          c.habitId === habit.id &&
          c.uid === actingUid &&
          c.cadence === 'daily' &&
          c.dayKey === ctx.dayKey
        ),
    );
  }
  return rows.filter(
    (c) =>
      !(
        c.habitId === habit.id &&
        c.uid === actingUid &&
        c.cadence === 'weekly' &&
        c.weekKey === ctx.weekKey
      ),
  );
}

/**
 * Runs after a habit check-in row is created or removed. Updates couple daily streak fields,
 * grants XP on shared transitions, and unlocks habit badges.
 */
export async function afterHabitCheckin(
  actingUid: string,
  coupleId: string,
  habit: Habit,
  toggleResult: 'added' | 'removed',
  ctx: HabitCheckinContext,
): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;

  try {
  const todayKey = localDayKey();
  const minKey = offsetLocalDayKey(todayKey, -400);
  const habits = await fetchActiveHabitsForCouple(coupleId);
  const dailyCheckins = await fetchCheckinsInDayKeyRange(coupleId, minKey, todayKey);
  const weekKey = ctx.kind === 'weekly' ? ctx.weekKey : localWeekKey();
  const weeklyCheckins = await fetchWeeklyCheckinsForWeek(coupleId, weekKey);
  const merged = mergedCheckinsForKeys(dailyCheckins, weeklyCheckins);
  const keysFull = indexHabitCheckins(merged);
  const keysWithoutToggle = indexHabitCheckins(filterOutToggledCheckin(merged, habit, actingUid, ctx));

  if (toggleResult === 'removed') {
    await recomputeAndPersistDailyStreaks(coupleId, habits, dailyCheckins, pair.uidA, pair.uidB, todayKey);
    return;
  }

  const preSnap = await getDoc(coupleDoc(coupleId));
  const preC = preSnap.exists() ? (preSnap.data() as Couple) : null;
  const preStreakA = preC?.dailyStreaks?.[pair.uidA]?.currentStreak ?? 0;
  const preStreakB = preC?.dailyStreaks?.[pair.uidB]?.currentStreak ?? 0;
  const oldActing = actingUid === pair.uidA ? preStreakA : preStreakB;

  const xp: GrantXpResult[] = [];

  /** Once per habit per local day/week for shared XP (undo + re-check same period must not re-grant). */
  if (habit.scope === 'personal' && toggleResult === 'added') {
    const hRef = doc(habitsCol(), habit.id);
    if (habit.cadence === 'daily' && ctx.kind === 'daily') {
      const snapSelf = await getDoc(hRef);
      const hRow = snapSelf.exists() ? (snapSelf.data() as Habit) : habit;
      const selfDaily = { ...(hRow.lastSelfDailyXpByUid ?? {}) };
      if (selfDaily[actingUid] !== ctx.dayKey) {
        const r = await grantXpSafe(actingUid, XP_REWARDS.habit_self_personal_daily);
        if (r) xp.push(r);
        selfDaily[actingUid] = ctx.dayKey;
        try {
          await updateDoc(hRef, { lastSelfDailyXpByUid: selfDaily });
        } catch (e) {
          console.warn('[gamification] personal habit daily xp guard write failed:', habit.id, e);
        }
      }
    } else if (habit.cadence === 'weekly' && ctx.kind === 'weekly') {
      const snapSelf = await getDoc(hRef);
      const hRow = snapSelf.exists() ? (snapSelf.data() as Habit) : habit;
      const selfWeekly = { ...(hRow.lastSelfWeeklyXpByUid ?? {}) };
      if (selfWeekly[actingUid] !== ctx.weekKey) {
        const r = await grantXpSafe(actingUid, XP_REWARDS.habit_self_personal_weekly);
        if (r) xp.push(r);
        selfWeekly[actingUid] = ctx.weekKey;
        try {
          await updateDoc(hRef, { lastSelfWeeklyXpByUid: selfWeekly });
        } catch (e) {
          console.warn('[gamification] personal habit weekly xp guard write failed:', habit.id, e);
        }
      }
    }
  }

  if (habit.scope === 'shared' && toggleResult === 'added') {
    const hRef = doc(habitsCol(), habit.id);

    if (habit.cadence === 'daily' && ctx.kind === 'daily') {
      const snapSelf = await getDoc(hRef);
      const hRow = snapSelf.exists() ? (snapSelf.data() as Habit) : habit;
      const selfDaily = { ...(hRow.lastSelfDailyXpByUid ?? {}) };
      if (selfDaily[actingUid] !== ctx.dayKey) {
        const r = await grantXpSafe(actingUid, XP_REWARDS.habit_self_daily);
        if (r) xp.push(r);
        selfDaily[actingUid] = ctx.dayKey;
        try {
          await updateDoc(hRef, { lastSelfDailyXpByUid: selfDaily });
        } catch (e) {
          console.warn('[gamification] habit xp guard write failed:', habit.id, e);
        }
      }

      const bothBefore =
        hasDailyCheckin(keysWithoutToggle, habit.id, pair.uidA, ctx.dayKey) &&
        hasDailyCheckin(keysWithoutToggle, habit.id, pair.uidB, ctx.dayKey);
      const bothAfter =
        hasDailyCheckin(keysFull, habit.id, pair.uidA, ctx.dayKey) &&
        hasDailyCheckin(keysFull, habit.id, pair.uidB, ctx.dayKey);
      const snapJoint = await getDoc(hRef);
      const jointDay =
        snapJoint.exists() ? (snapJoint.data() as Habit).lastJointDailyBonusDayKey : undefined;
      if (!bothBefore && bothAfter && jointDay !== ctx.dayKey) {
        const j1 = await grantXpSafe(pair.uidA, XP_REWARDS.habit_joint_daily);
        const j2 = await grantXpSafe(pair.uidB, XP_REWARDS.habit_joint_daily);
        if (j1) xp.push(j1);
        if (j2) xp.push(j2);
        if (j1 && j2) {
          try {
            await updateDoc(hRef, { lastJointDailyBonusDayKey: ctx.dayKey });
          } catch (e) {
            console.warn('[gamification] habit joint daily guard write failed:', habit.id, e);
          }
        }
      }
    } else if (habit.cadence === 'weekly' && ctx.kind === 'weekly') {
      const snapSelf = await getDoc(hRef);
      const hRow = snapSelf.exists() ? (snapSelf.data() as Habit) : habit;
      const selfWeekly = { ...(hRow.lastSelfWeeklyXpByUid ?? {}) };
      if (selfWeekly[actingUid] !== ctx.weekKey) {
        const r = await grantXpSafe(actingUid, XP_REWARDS.habit_self_weekly);
        if (r) xp.push(r);
        selfWeekly[actingUid] = ctx.weekKey;
        try {
          await updateDoc(hRef, { lastSelfWeeklyXpByUid: selfWeekly });
        } catch (e) {
          console.warn('[gamification] habit weekly self xp guard write failed:', habit.id, e);
        }
      }

      const bothBefore =
        hasWeeklyCheckin(keysWithoutToggle, habit.id, pair.uidA, ctx.weekKey) &&
        hasWeeklyCheckin(keysWithoutToggle, habit.id, pair.uidB, ctx.weekKey);
      const bothAfter =
        hasWeeklyCheckin(keysFull, habit.id, pair.uidA, ctx.weekKey) &&
        hasWeeklyCheckin(keysFull, habit.id, pair.uidB, ctx.weekKey);
      const snapJoint = await getDoc(hRef);
      const jointWk =
        snapJoint.exists() ? (snapJoint.data() as Habit).lastJointWeeklyBonusWeekKey : undefined;
      if (!bothBefore && bothAfter && jointWk !== ctx.weekKey) {
        const j1 = await grantXpSafe(pair.uidA, XP_REWARDS.habit_joint_weekly);
        const j2 = await grantXpSafe(pair.uidB, XP_REWARDS.habit_joint_weekly);
        if (j1) xp.push(j1);
        if (j2) xp.push(j2);
        if (j1 && j2) {
          try {
            await updateDoc(hRef, { lastJointWeeklyBonusWeekKey: ctx.weekKey });
          } catch (e) {
            console.warn('[gamification] habit joint weekly guard write failed:', habit.id, e);
          }
        }
      }
    }
  }

  const allDailyBefore = jointSharedDailiesBothDoneOnDay(habits, pair.uidA, pair.uidB, todayKey, keysWithoutToggle);
  const allDailyAfter = jointSharedDailiesBothDoneOnDay(habits, pair.uidA, pair.uidB, todayKey, keysFull);
  if (!allDailyBefore && allDailyAfter) {
    try {
      await recordHabitWeeklyChallengeJointDay(coupleId, todayKey);
    } catch (e) {
      console.warn('[gamification] recordHabitWeeklyChallengeJointDay failed:', e);
    }
  }

  await recomputeAndPersistDailyStreaks(coupleId, habits, dailyCheckins, pair.uidA, pair.uidB, todayKey);

  const postSnap = await getDoc(coupleDoc(coupleId));
  const postC = postSnap.exists() ? (postSnap.data() as Couple) : null;
  const newA = postC?.dailyStreaks?.[pair.uidA]?.currentStreak ?? 0;
  const newB = postC?.dailyStreaks?.[pair.uidB]?.currentStreak ?? 0;
  const newJoint = postC?.jointDailyStreak ?? 0;
  const newActing = actingUid === pair.uidA ? newA : newB;

  for (const m of HABIT_STREAK_MILESTONES) {
    if (newActing >= m && oldActing < m) {
      const mx = await grantXpSafe(actingUid, XP_REWARDS.habit_streak_milestone);
      if (mx) xp.push(mx);
    }
  }

  const countSnap = await getCountFromServer(
    query(habitCheckinsCol(), where('coupleId', '==', coupleId), where('uid', '==', actingUid)),
  );
  const totalCheckins = countSnap.data().count;
  const isFirstCheckin = totalCheckins === 1;

  // Active habit count for the acting user (drives habit_collector_* tiers).
  const myActiveHabitCount = habits.filter(
    (h) => !h.archived && (h.scope === 'shared' || h.createdBy === actingUid),
  ).length;

  const badgeNew: string[] = [];
  badgeNew.push(...(await evaluateFirstCheckinBadge(actingUid, isFirstCheckin)));
  badgeNew.push(
    ...(await evaluateHabitStreakBadges(pair.uidA, pair.uidB, newA, newB, newJoint)),
  );
  badgeNew.push(
    ...(await evaluateHabitDepthBadges(actingUid, totalCheckins, myActiveHabitCount)),
  );

  enqueueGamificationToasts(xp, badgeNew);
  } catch (e) {
    console.warn('[gamification] afterHabitCheckin failed', e);
  }
}

export async function afterCeremonyFullyCompleted(
  coupleId: string,
  completedCeremony: Ceremony,
  nominations: Nomination[],
): Promise<string[]> {
  const pair = await couplePair(coupleId);
  if (!pair) return [];
  await updateCoupleStreakAfterCeremonyComplete(coupleId, completedCeremony.periodEnd.toMillis());
  return evaluateCeremonyCompleteBadges(
    coupleId,
    pair.uidA,
    pair.uidB,
    completedCeremony,
    nominations,
  );
}
