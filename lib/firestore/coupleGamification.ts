import { getDoc, updateDoc } from 'firebase/firestore';
import type { Couple, CoupleStreaksState, CoupleWeeklyChallengeState, WeeklyChallengeKind } from '@/types';
import { coupleDoc } from '@/lib/firestore/couples';
import { localDayKey, localWeekKey, previousLocalDayKey, weekLocalDayKeysFromMonday } from '@/lib/dateKeys';
import { pickChallengeForWeek } from '@/constants/challenges';
import { grantXp, type GrantXpResult } from '@/lib/firestore/gamification';
import { XP_REWARDS } from '@/constants/levels';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { DEFAULT_STREAKS } from '@/lib/coupleGamificationDefaults';
import {
  evaluateReasonStreakCoupleBadges,
  evaluateWeeklyChallengeBadges,
} from '@/lib/gamificationBadges';

/** Streak thresholds rewarded with `*_streak_milestone` XP. Mirrors HABIT_STREAK_MILESTONES. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 90] as const;

/** Returns the highest milestone in [...STREAK_MILESTONES] that is <= streak. 0 if none reached. */
export function highestMilestoneReached(streak: number): number {
  let best = 0;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) best = m;
  }
  return best;
}

function nextStreakValue(lastKey: string | null, todayKey: string, current: number): { streak: number; bumped: boolean } {
  if (lastKey === todayKey) return { streak: current, bumped: false };
  if (lastKey === null) return { streak: Math.max(1, current || 1), bumped: true };
  const yest = previousLocalDayKey(todayKey);
  if (lastKey === yest) return { streak: current + 1, bumped: true };
  return { streak: 1, bumped: true };
}

export async function ensureWeeklyChallengeRotated(coupleId: string): Promise<void> {
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as Couple;
  const weekKey = localWeekKey();
  const existing = c.weeklyChallenge;
  if (existing && existing.weekKey === weekKey) return;

  const picked = pickChallengeForWeek(weekKey);
  const next: CoupleWeeklyChallengeState = {
    kind: picked.kind,
    weekKey,
    description: picked.description,
    completedBy: [],
    xpGranted: false,
  };
  await updateDoc(ref, { weeklyChallenge: next });
}

type StreakKind = 'decision' | 'nomination' | 'ceremony' | 'reason';

async function patchStreak(
  coupleId: string,
  kind: StreakKind,
  ceremonyOnTime?: boolean,
): Promise<{ dailyCheckinBoth: boolean; reasonStreakBumped: boolean }> {
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { dailyCheckinBoth: false, reasonStreakBumped: false };
  const c = snap.data() as Couple;
  const streaks: CoupleStreaksState = { ...DEFAULT_STREAKS, ...c.streaks };
  const todayKey = localDayKey();
  let dailyCheckinBoth = false;
  let reasonStreakBumped = false;

  if (kind === 'decision') {
    const { streak, bumped } = nextStreakValue(streaks.lastDecisionDayKey, todayKey, streaks.decisionStreak);
    streaks.decisionStreak = streak;
    streaks.lastDecisionDayKey = todayKey;
    if (bumped) dailyCheckinBoth = true;
  } else if (kind === 'nomination') {
    const { streak } = nextStreakValue(streaks.lastNominationDayKey, todayKey, streaks.nominationStreak);
    streaks.nominationStreak = streak;
    streaks.lastNominationDayKey = todayKey;
  } else if (kind === 'reason') {
    const { streak, bumped } = nextStreakValue(streaks.lastReasonDayKey, todayKey, streaks.reasonStreak);
    streaks.reasonStreak = streak;
    streaks.lastReasonDayKey = todayKey;
    if (bumped) reasonStreakBumped = true;
  } else {
    const last = streaks.lastCeremonyCompleteDayKey;
    if (last === todayKey) {
      /* already recorded today */
    } else if (ceremonyOnTime === false) {
      streaks.ceremonyStreak = 1;
      streaks.lastCeremonyCompleteDayKey = todayKey;
    } else {
      const { streak } = nextStreakValue(last, todayKey, streaks.ceremonyStreak);
      streaks.ceremonyStreak = streak;
      streaks.lastCeremonyCompleteDayKey = todayKey;
    }
  }

  await updateDoc(ref, { streaks });
  return { dailyCheckinBoth, reasonStreakBumped };
}

/** Quick Spin / battle decision saved. Bumps streak, grants daily_checkin + streak-milestone XP, returns new badges. */
export async function updateCoupleStreakAfterDecision(coupleId: string): Promise<{ xp: (GrantXpResult | null)[]; badgeIds: string[] }> {
  const { dailyCheckinBoth } = await patchStreak(coupleId, 'decision');
  const xp: (GrantXpResult | null)[] = [];
  if (!dailyCheckinBoth) return { xp, badgeIds: [] };
  const snap = await getDoc(coupleDoc(coupleId));
  if (!snap.exists()) return { xp, badgeIds: [] };
  const c = snap.data() as Couple;
  const streaks: CoupleStreaksState = { ...DEFAULT_STREAKS, ...c.streaks };

  xp.push(await grantXp(c.user1Id, XP_REWARDS.daily_checkin));
  xp.push(await grantXp(c.user2Id, XP_REWARDS.daily_checkin));

  // Streak milestone — grant XP once per (per-threshold) crossing.
  const reached = highestMilestoneReached(streaks.decisionStreak);
  const previouslyRewarded = c.lastDecisionStreakMilestoneRewarded ?? 0;
  if (reached > previouslyRewarded) {
    xp.push(await grantXp(c.user1Id, XP_REWARDS.decision_streak_milestone));
    xp.push(await grantXp(c.user2Id, XP_REWARDS.decision_streak_milestone));
    await updateDoc(coupleDoc(coupleId), { lastDecisionStreakMilestoneRewarded: reached });
  }

  return { xp, badgeIds: [] };
}

export async function updateCoupleStreakAfterNomination(coupleId: string): Promise<void> {
  await patchStreak(coupleId, 'nomination');
}

export type ReasonStreakUpdateResult = {
  xp: (GrantXpResult | null)[];
  badgeIds: string[];
};

/**
 * Bumps couple reason streak; XP when the streak day advances; streak-tier badges when a new
 * threshold is reached. Caller merges into one toast batch with `reason_written` XP and author badges.
 */
export async function updateCoupleStreakAfterReason(coupleId: string): Promise<ReasonStreakUpdateResult> {
  const { reasonStreakBumped } = await patchStreak(coupleId, 'reason');
  const snap = await getDoc(coupleDoc(coupleId));
  if (!snap.exists()) return { xp: [], badgeIds: [] };
  const c = snap.data() as Couple;
  const streaks: CoupleStreaksState = { ...DEFAULT_STREAKS, ...c.streaks };
  const reasonStreak = streaks.reasonStreak;

  const xp: (GrantXpResult | null)[] = [];
  if (reasonStreakBumped) {
    const a = await grantXp(c.user1Id, XP_REWARDS.reason_streak_day);
    const b = await grantXp(c.user2Id, XP_REWARDS.reason_streak_day);
    xp.push(a, b);

    const reached = highestMilestoneReached(reasonStreak);
    const previouslyRewarded = c.lastReasonStreakMilestoneRewarded ?? 0;
    if (reached > previouslyRewarded) {
      xp.push(await grantXp(c.user1Id, XP_REWARDS.reason_streak_milestone));
      xp.push(await grantXp(c.user2Id, XP_REWARDS.reason_streak_milestone));
      await updateDoc(coupleDoc(coupleId), { lastReasonStreakMilestoneRewarded: reached });
    }
  }

  const badgeIds =
    reasonStreakBumped && reasonStreak > 0
      ? await evaluateReasonStreakCoupleBadges(coupleId, c.user1Id, c.user2Id, reasonStreak)
      : [];

  return { xp, badgeIds };
}

export async function updateCoupleStreakAfterCeremonyComplete(
  coupleId: string,
  periodEndMs: number,
): Promise<void> {
  const graceMs = 7 * 86400000;
  const onTime = Date.now() <= periodEndMs + graceMs;
  await patchStreak(coupleId, 'ceremony', onTime);
}

export async function recordWeeklyChallengeProgress(
  coupleId: string,
  kind: WeeklyChallengeKind,
  uid: string,
): Promise<void> {
  await ensureWeeklyChallengeRotated(coupleId);
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as Couple;
  const wc = c.weeklyChallenge;
  if (!wc || wc.xpGranted || wc.kind !== kind) return;

  const completed = new Set(wc.completedBy);
  completed.add(uid);
  const completedBy = Array.from(completed);

  if (completedBy.includes(c.user1Id) && completedBy.includes(c.user2Id)) {
    const a = await grantXp(c.user1Id, XP_REWARDS.weekly_challenge_completed);
    const b = await grantXp(c.user2Id, XP_REWARDS.weekly_challenge_completed);
    const newWinsTotal = (c.weeklyChallengeWinsTotal ?? 0) + 1;
    const badgeIds = await evaluateWeeklyChallengeBadges(c.user1Id, c.user2Id, newWinsTotal);
    enqueueGamificationToasts([a, b], badgeIds);
    await updateDoc(ref, {
      weeklyChallenge: { ...wc, completedBy, xpGranted: true },
      weeklyChallengeWinsTotal: newWinsTotal,
    });
  } else {
    await updateDoc(ref, {
      weeklyChallenge: { ...wc, completedBy },
    });
  }
}

/**
 * When the weekly challenge is `both_habit_allday`, records a local calendar day where **every**
 * shared **daily** habit was both-done (same semantics as the Habits v2 board). Grants weekly XP
 * once all seven local days in the challenge week have such a joint-complete day.
 */
export async function recordHabitWeeklyChallengeJointDay(
  coupleId: string,
  jointDayKey: string,
): Promise<void> {
  await ensureWeeklyChallengeRotated(coupleId);
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as Couple;
  const wc = c.weeklyChallenge;
  if (!wc || wc.xpGranted || wc.kind !== 'both_habit_allday') return;

  const weekDays = weekLocalDayKeysFromMonday(wc.weekKey);
  if (!weekDays.includes(jointDayKey)) return;

  const prev = new Set(wc.habitJointDayKeysThisWeek ?? []);
  prev.add(jointDayKey);
  const habitJointDayKeysThisWeek = Array.from(prev).sort();

  const coversFullWeek = weekDays.every((dk) => habitJointDayKeysThisWeek.includes(dk));
  if (coversFullWeek) {
    const a = await grantXp(c.user1Id, XP_REWARDS.weekly_challenge_completed);
    const b = await grantXp(c.user2Id, XP_REWARDS.weekly_challenge_completed);
    const newWinsTotal = (c.weeklyChallengeWinsTotal ?? 0) + 1;
    const badgeIds = await evaluateWeeklyChallengeBadges(c.user1Id, c.user2Id, newWinsTotal);
    enqueueGamificationToasts([a, b], badgeIds);
    await updateDoc(ref, {
      weeklyChallenge: { ...wc, habitJointDayKeysThisWeek, xpGranted: true },
      weeklyChallengeWinsTotal: newWinsTotal,
    });
  } else {
    await updateDoc(ref, {
      weeklyChallenge: { ...wc, habitJointDayKeysThisWeek },
    });
  }
}
