import { getDoc, updateDoc } from 'firebase/firestore';
import type { Couple, CoupleStreaksState, CoupleWeeklyChallengeState, WeeklyChallengeKind } from '@/types';
import { coupleDoc } from '@/lib/firestore/couples';
import { localDayKey, localWeekKey, previousLocalDayKey } from '@/lib/dateKeys';
import { pickChallengeForWeek } from '@/constants/challenges';
import { grantXp, type GrantXpResult } from '@/lib/firestore/gamification';
import { XP_REWARDS } from '@/constants/levels';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';
import { DEFAULT_STREAKS } from '@/lib/coupleGamificationDefaults';
import { evaluateReasonStreakCoupleBadges } from '@/lib/gamificationBadges';

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

/** Quick Spin / battle decision saved */
export async function updateCoupleStreakAfterDecision(coupleId: string): Promise<void> {
  const { dailyCheckinBoth } = await patchStreak(coupleId, 'decision');
  if (!dailyCheckinBoth) return;
  const snap = await getDoc(coupleDoc(coupleId));
  if (!snap.exists()) return;
  const c = snap.data() as Couple;
  const a = await grantXp(c.user1Id, XP_REWARDS.daily_checkin);
  const b = await grantXp(c.user2Id, XP_REWARDS.daily_checkin);
  enqueueGamificationToasts([a, b], []);
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
    enqueueGamificationToasts([a, b], []);
    await updateDoc(ref, {
      weeklyChallenge: { ...wc, completedBy, xpGranted: true },
    });
  } else {
    await updateDoc(ref, {
      weeklyChallenge: { ...wc, completedBy },
    });
  }
}
