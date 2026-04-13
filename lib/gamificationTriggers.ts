import { getCouple } from '@/lib/firestore/couples';
import { grantXp, type GrantXpResult } from '@/lib/firestore/gamification';
import { XP_REWARDS } from '@/constants/levels';
import {
  updateCoupleStreakAfterDecision,
  updateCoupleStreakAfterNomination,
  updateCoupleStreakAfterReason,
  updateCoupleStreakAfterCeremonyComplete,
  recordWeeklyChallengeProgress,
} from '@/lib/firestore/coupleGamification';
import {
  evaluateDecisionCoupleBadges,
  evaluateNominationCoupleBadges,
  evaluateReasonsCoupleBadges,
  evaluateReasonAuthorBadges,
  evaluateCeremonyCompleteBadges,
} from '@/lib/gamificationBadges';
import type { Ceremony, Nomination } from '@/types';
import { query, where, getDocs } from 'firebase/firestore';
import { isUserAuthoredNomination } from '@/lib/nominationSeeded';
import { nominationsCol } from '@/lib/firestore/nominations';
import { enqueueGamificationToasts } from '@/lib/stores/xpFeedbackStore';

async function couplePair(coupleId: string): Promise<{ uidA: string; uidB: string } | null> {
  const c = await getCouple(coupleId);
  if (!c) return null;
  return { uidA: c.user1Id, uidB: c.user2Id };
}

/** Quick Spin decision saved (acting user gets decision XP). */
export async function afterQuickSpinDecisionSaved(actingUid: string, coupleId: string): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;
  const xp: GrantXpResult[] = [];
  const r = await grantXp(actingUid, XP_REWARDS.decision_made);
  if (r) xp.push(r);

  await updateCoupleStreakAfterDecision(coupleId);
  await recordWeeklyChallengeProgress(coupleId, 'both_quickspin', actingUid);

  const badgeNew = await evaluateDecisionCoupleBadges(coupleId, pair.uidA, pair.uidB);
  enqueueGamificationToasts(xp, badgeNew);
}

/** Battle decision row written (both already get XP in grantBattleCompletionRewards). */
export async function afterBattleDecisionSaved(coupleId: string): Promise<void> {
  const pair = await couplePair(coupleId);
  if (!pair) return;
  await updateCoupleStreakAfterDecision(coupleId);
  const badgeNew = await evaluateDecisionCoupleBadges(coupleId, pair.uidA, pair.uidB);
  enqueueGamificationToasts([], badgeNew);
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
