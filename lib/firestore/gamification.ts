import { getDoc, updateDoc, query, where, getCountFromServer } from 'firebase/firestore';
import { UserProfile } from '@/types';
import { XP_REWARDS, getLevelForXp } from '@/constants/levels';
import { BATTLE_DECISION_TIERS } from '@/constants/awardsBadgeTiers';
import { userDoc } from '@/lib/firestore/users';
import { decisionsCol } from '@/lib/firestore/decisions';

export type CeremonyRewardMeta = {
  deliberationDisagreements: number;
  categoryCountWithNominations: number;
};

export type GrantXpResult = {
  previousLevel: number;
  newLevel: number;
  previousLevelName: string;
  newLevelName: string;
  xpGained: number;
};

/**
 * Add XP and level for one user. Returns level boundaries for celebration UI.
 */
export async function grantXp(uid: string, amount: number): Promise<GrantXpResult | null> {
  if (amount <= 0) return null;
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  const p = snap.data() as UserProfile;
  const prevXp = p.xp ?? 0;
  const prevMeta = getLevelForXp(prevXp);
  const newXp = prevXp + amount;
  const nextMeta = getLevelForXp(newXp);
  await updateDoc(userDoc(uid), {
    xp: newXp,
    level: nextMeta.level,
  });
  return {
    previousLevel: prevMeta.level,
    newLevel: nextMeta.level,
    previousLevelName: prevMeta.name,
    newLevelName: nextMeta.name,
    xpGained: amount,
  };
}

export async function mergeBadges(uid: string, newBadgeIds: string[]): Promise<string[]> {
  if (newBadgeIds.length === 0) return [];
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return [];
  const p = snap.data() as UserProfile;
  const badges = new Set(p.badges ?? []);
  const added: string[] = [];
  for (const id of newBadgeIds) {
    if (!badges.has(id)) {
      badges.add(id);
      added.push(id);
    }
  }
  if (added.length === 0) return [];
  await updateDoc(userDoc(uid), { badges: Array.from(badges) });
  return added;
}

export async function grantXpAndMergeBadges(
  uid: string,
  xpAmount: number,
  badgeIds: string[],
): Promise<{ xp: GrantXpResult | null; newBadges: string[] }> {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return { xp: null, newBadges: [] };
  const p = snap.data() as UserProfile;
  const prevXp = p.xp ?? 0;
  const prevMeta = getLevelForXp(prevXp);
  const newXp = prevXp + Math.max(0, xpAmount);
  const nextMeta = getLevelForXp(newXp);
  const badges = new Set(p.badges ?? []);
  const newBadges: string[] = [];
  for (const id of badgeIds) {
    if (!badges.has(id)) {
      badges.add(id);
      newBadges.push(id);
    }
  }
  await updateDoc(userDoc(uid), {
    xp: newXp,
    level: nextMeta.level,
    badges: Array.from(badges),
  });
  const xpResult: GrantXpResult | null =
    xpAmount > 0
      ? {
          previousLevel: prevMeta.level,
          newLevel: nextMeta.level,
          previousLevelName: prevMeta.name,
          newLevelName: nextMeta.name,
          xpGained: xpAmount,
        }
      : null;
  return { xp: xpResult, newBadges };
}

export type CeremonyGrantOutcome = {
  xp: (GrantXpResult | null)[];
  newBadges: string[];
};

/**
 * Both partners get ceremony XP; badges when earned (opening night, full agreement, overtime).
 */
export async function grantCeremonyCompletionRewards(
  uidA: string,
  uidB: string,
  meta: CeremonyRewardMeta,
): Promise<CeremonyGrantOutcome> {
  const fullAgreementEligible =
    meta.categoryCountWithNominations > 0 && meta.deliberationDisagreements === 0;
  const overtimeEarned = meta.deliberationDisagreements >= 3;

  const xp: (GrantXpResult | null)[] = [];
  const badgeSeen = new Set<string>();

  for (const uid of [uidA, uidB]) {
    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) continue;
    const p = snap.data() as UserProfile;
    const have = new Set(p.badges ?? []);
    const toAdd: string[] = [];
    if (!have.has('opening_night')) toAdd.push('opening_night');
    if (fullAgreementEligible && !have.has('full_agreement')) toAdd.push('full_agreement');
    if (overtimeEarned && !have.has('overtime')) toAdd.push('overtime');
    const { xp: x, newBadges } = await grantXpAndMergeBadges(uid, XP_REWARDS.ceremony_completed, toAdd);
    xp.push(x);
    for (const b of newBadges) badgeSeen.add(b);
  }

  return { xp, newBadges: [...badgeSeen] };
}

/** After successful alignment picks submit (per user, once per submit). */
export async function grantDeliberationSubmitXp(uid: string): Promise<{
  xp: GrantXpResult | null;
  newBadges: string[];
}> {
  const xp = await grantXp(uid, XP_REWARDS.deliberation_picks_submitted);
  const newBadges = await mergeBadges(uid, ['first_alignment_sheet']);
  return { xp, newBadges };
}

export type BattleGrantOutcome = {
  xp: (GrantXpResult | null)[];
  newBadges: string[];
};

/**
 * After saving a battle decision: +decision XP each; bracket tier badges from `BATTLE_DECISION_TIERS`.
 */
export async function grantBattleCompletionRewards(
  uidA: string,
  uidB: string,
  coupleId: string,
): Promise<BattleGrantOutcome> {
  const q = query(
    decisionsCol(),
    where('coupleId', '==', coupleId),
    where('mode', '==', 'battle'),
  );
  const countSnap = await getCountFromServer(q);
  const battleDecisionCount = countSnap.data().count;

  const xp: (GrantXpResult | null)[] = [];
  const badgeSeen = new Set<string>();
  const badgeIds: string[] = [];
  for (const t of BATTLE_DECISION_TIERS) {
    if (battleDecisionCount >= t.count) badgeIds.push(t.id);
  }

  for (const uid of [uidA, uidB]) {
    const { xp: x, newBadges } = await grantXpAndMergeBadges(uid, XP_REWARDS.decision_made, badgeIds);
    xp.push(x);
    for (const b of newBadges) badgeSeen.add(b);
  }

  return { xp, newBadges: [...badgeSeen] };
}
