import { query, where, getCountFromServer, getDocs, getDoc } from 'firebase/firestore';
import { userDoc } from '@/lib/firestore/users';
import { localDayKey } from '@/lib/dateKeys';
import { isUserAuthoredNomination } from '@/lib/nominationSeeded';
import { tallyAuthoredNominatorNominee } from '@/lib/nominationStats';
import { decisionsCol } from '@/lib/firestore/decisions';
import { nominationsCol } from '@/lib/firestore/nominations';
import { reasonsCol } from '@/lib/firestore/reasons';
import { ceremoniesCol } from '@/lib/firestore/ceremonies';
import { getCouple } from '@/lib/firestore/couples';
import { mergeBadges } from '@/lib/firestore/gamification';
import { enabledAwardCategoryIds, mergeCoupleAwardCategoryDefaults } from '@/lib/awardCategoryConfig';
import {
  AWARDS_FILED_TIERS,
  AWARDS_JAR_COUPLE_TIERS,
  AWARDS_PHOTO_COUPLE_TIERS,
  AWARDS_SPOTLIGHT_TIERS,
  SEASONS_VAULT_COUPLE_TIERS,
} from '@/constants/awardsBadgeTiers';
import {
  REASONS_LINE_COUNT_BADGES,
  REASONS_STREAK_DAY_BADGES,
} from '@/constants/reasonsBadgeTiers';
import { ALL_DECISIONS_COUPLE_TIERS, QUICKSPIN_COUPLE_TIERS } from '@/constants/decideBadgeTiers';
import type { Ceremony, Nomination, Reason, UserProfile } from '@/types';

function winBadgeIdForCategory(cat: string): string {
  return `won_${cat}`;
}

function uidsCrownedForNominee(
  nomineeId: string | 'both',
  uidA: string,
  uidB: string,
): string[] {
  if (nomineeId === 'both') return [uidA, uidB];
  if (nomineeId === uidA) return [uidA];
  if (nomineeId === uidB) return [uidB];
  return [];
}

/** Wins per user per category across completed ceremonies (nomineeId on the winner). */
function aggregateCategoryWinsByUid(
  ceremonies: Ceremony[],
  uidA: string,
  uidB: string,
): Record<string, Record<string, number>> {
  const acc: Record<string, Record<string, number>> = {
    [uidA]: {},
    [uidB]: {},
  };
  for (const c of ceremonies) {
    const wins = c.winners ?? {};
    for (const cat of Object.keys(wins)) {
      const winner = wins[cat];
      if (!winner) continue;
      for (const uid of uidsCrownedForNominee(winner.nomineeId, uidA, uidB)) {
        const row = acc[uid]!;
        row[cat] = (row[cat] ?? 0) + 1;
      }
    }
  }
  return acc;
}

/** Writes partner profile badges from one device — needs rules allowing partner `badges` updates. */
async function mergeBadgesSafe(uid: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    return await mergeBadges(uid, ids);
  } catch (e) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
    if (code === 'permission-denied') {
      console.warn(
        '[badges] mergeBadges permission denied — ensure partner can receive `badges` updates (see Firestore users rule):',
        uid,
      );
    } else {
      console.warn('[badges] mergeBadges failed:', uid, e);
    }
    return [];
  }
}

async function grantToBoth(uidA: string, uidB: string, badgeIds: string[]): Promise<string[]> {
  const a = await mergeBadgesSafe(uidA, badgeIds);
  const b = await mergeBadgesSafe(uidB, badgeIds);
  return [...new Set([...a, ...b])];
}

/** Quick Spin / any decision write — couple-scoped decision badges */
export async function evaluateDecisionCoupleBadges(
  coupleId: string,
  uidA: string,
  uidB: string,
): Promise<string[]> {
  const unlocked: string[] = [];

  const qSpin = query(
    decisionsCol(),
    where('coupleId', '==', coupleId),
    where('mode', '==', 'quickspin'),
  );
  const qAll = query(decisionsCol(), where('coupleId', '==', coupleId));
  const qFood = query(
    decisionsCol(),
    where('coupleId', '==', coupleId),
    where('category', '==', 'food'),
  );
  const qMovie = query(
    decisionsCol(),
    where('coupleId', '==', coupleId),
    where('category', '==', 'movie'),
  );

  const [spinSnap, allSnap, foodSnap, movieSnap] = await Promise.all([
    getCountFromServer(qSpin),
    getCountFromServer(qAll),
    getCountFromServer(qFood),
    getCountFromServer(qMovie),
  ]);

  const spinCount = spinSnap.data().count;
  const allDecisions = allSnap.data().count;
  const foodCount = foodSnap.data().count;
  const movieCount = movieSnap.data().count;

  const coupleBadgeIds: string[] = [];
  if (spinCount >= 1) coupleBadgeIds.push('first_spin');
  for (const t of QUICKSPIN_COUPLE_TIERS) {
    if (spinCount >= t.count) coupleBadgeIds.push(t.id);
  }
  for (const t of ALL_DECISIONS_COUPLE_TIERS) {
    if (allDecisions >= t.count) coupleBadgeIds.push(t.id);
  }
  if (allDecisions >= 100) coupleBadgeIds.push('decisive');
  if (foodCount >= 50) coupleBadgeIds.push('foodie');
  if (movieCount >= 20) coupleBadgeIds.push('night_in');

  if (coupleBadgeIds.length) {
    unlocked.push(...(await grantToBoth(uidA, uidB, [...new Set(coupleBadgeIds)])));
  }

  return [...new Set(unlocked)];
}

/** Per-user: writing nominations + being nominated. */
export async function evaluateNominatorNomineeBadges(
  coupleId: string,
  uidA: string,
  uidB: string,
): Promise<string[]> {
  const unlocked: string[] = [];

  const snap = await getDocs(query(nominationsCol(), where('coupleId', '==', coupleId)));
  const rows = snap.docs.map((d) => d.data() as Nomination);
  const { subA, subB, spotlightA, spotlightB } = tallyAuthoredNominatorNominee(rows, uidA, uidB);

  const packs: { uid: string; submitted: number; spotlight: number }[] = [
    { uid: uidA, submitted: subA, spotlight: spotlightA },
    { uid: uidB, submitted: subB, spotlight: spotlightB },
  ];

  for (const { uid, submitted, spotlight } of packs) {
    const ids: string[] = [];
    for (const t of AWARDS_FILED_TIERS) {
      if (submitted >= t.count) ids.push(t.id);
    }
    for (const t of AWARDS_SPOTLIGHT_TIERS) {
      if (spotlight >= t.count) ids.push(t.id);
    }
    if (ids.length) unlocked.push(...(await mergeBadges(uid, ids)));
  }

  return [...new Set(unlocked)];
}

export async function evaluateNominationCoupleBadges(
  coupleId: string,
  uidA: string,
  uidB: string,
  ceremony: { id: string; periodEnd: { toMillis: () => number } },
  nominations: Nomination[],
): Promise<string[]> {
  const unlocked: string[] = [];

  const allCoupleSnap = await getDocs(query(nominationsCol(), where('coupleId', '==', coupleId)));
  const authoredRows = allCoupleSnap.docs
    .map((d) => d.data() as Nomination)
    .filter((n) => isUserAuthoredNomination(n));
  const userAuthoredCount = authoredRows.length;

  const jarIds: string[] = [];
  for (const t of AWARDS_JAR_COUPLE_TIERS) {
    if (userAuthoredCount >= t.count) jarIds.push(t.id);
  }
  if (jarIds.length) unlocked.push(...(await grantToBoth(uidA, uidB, jarIds)));

  const photoCount = authoredRows.filter(
    (n) => !!(n.photoUrl && String(n.photoUrl).trim()),
  ).length;
  const photoIds: string[] = [];
  for (const t of AWARDS_PHOTO_COUPLE_TIERS) {
    if (photoCount >= t.count) photoIds.push(t.id);
  }
  if (photoIds.length) unlocked.push(...(await grantToBoth(uidA, uidB, photoIds)));

  const inSeason = nominations.filter(
    (n) => n.ceremonyId === ceremony.id && isUserAuthoredNomination(n),
  );
  const cats = new Set(inSeason.map((n) => n.category));
  const coupleDoc = await getCouple(coupleId);
  const enabled = coupleDoc
    ? enabledAwardCategoryIds(mergeCoupleAwardCategoryDefaults(coupleDoc).awardCategories ?? [])
    : [];
  const allEnabledHaveNom =
    enabled.length > 0 && enabled.every((id) => cats.has(id));
  if (allEnabledHaveNom) {
    unlocked.push(...(await grantToBoth(uidA, uidB, ['category_completionist'])));
    const msLeft = ceremony.periodEnd.toMillis() - Date.now();
    if (msLeft > 60 * 86400000) {
      unlocked.push(...(await grantToBoth(uidA, uidB, ['early_bird'])));
    }
  }

  unlocked.push(...(await evaluateNominatorNomineeBadges(coupleId, uidA, uidB)));

  return [...new Set(unlocked)];
}

function hasThreeConsecutiveMonthsWithReason(timestampsMs: number[]): boolean {
  if (timestampsMs.length === 0) return false;
  const months = new Set(
    timestampsMs.map((t) => {
      const d = new Date(t);
      return d.getFullYear() * 12 + d.getMonth();
    }),
  );
  const sorted = [...months].sort((a, b) => a - b);
  for (let i = 0; i <= sorted.length - 3; i++) {
    if (sorted[i + 1] === sorted[i]! + 1 && sorted[i + 2] === sorted[i]! + 2) return true;
  }
  return false;
}

export async function evaluateReasonStreakCoupleBadges(
  _coupleId: string,
  uidA: string,
  uidB: string,
  reasonStreak: number,
): Promise<string[]> {
  const ids: string[] = [];
  for (const t of REASONS_STREAK_DAY_BADGES) {
    if (reasonStreak >= t.days) ids.push(t.id);
  }
  if (ids.length === 0) return [];
  return grantToBoth(uidA, uidB, ids);
}

/**
 * Both partners have written at least one reason about the other — rewards the mutual loop.
 */
export async function evaluateReasonsCoupleBadges(
  coupleId: string,
  uidA: string,
  uidB: string,
): Promise<string[]> {
  const [snapA, snapB] = await Promise.all([
    getDocs(query(reasonsCol(), where('coupleId', '==', coupleId), where('authorId', '==', uidA))),
    getDocs(query(reasonsCol(), where('coupleId', '==', coupleId), where('authorId', '==', uidB))),
  ]);
  const aAboutB = snapA.docs.some((d) => (d.data() as Reason).aboutId === uidB);
  const bAboutA = snapB.docs.some((d) => (d.data() as Reason).aboutId === uidA);
  if (!aAboutB || !bAboutA) return [];
  return grantToBoth(uidA, uidB, ['both_pouring']);
}

/** Reasons — author-only badges (+ dedicated) */
export async function evaluateReasonAuthorBadges(
  coupleId: string,
  authorUid: string,
): Promise<string[]> {
  const q = query(
    reasonsCol(),
    where('coupleId', '==', coupleId),
    where('authorId', '==', authorUid),
  );
  const n = (await getCountFromServer(q)).data().count;
  const ids: string[] = [];
  if (n >= 1) ids.push('first_quill');
  for (const t of REASONS_LINE_COUNT_BADGES) {
    if (n >= t.lines) ids.push(t.id);
  }

  if (n >= 3) {
    const snap = await getDocs(q);
    const times = snap.docs.map((d) => {
      const createdAt = d.data().createdAt;
      return typeof createdAt?.toMillis === 'function' ? createdAt.toMillis() : 0;
    });
    if (hasThreeConsecutiveMonthsWithReason(times)) ids.push('dedicated');
  }

  if (ids.length === 0) return [];
  return mergeBadges(authorUid, ids);
}

export async function evaluateCeremonyCompleteBadges(
  coupleId: string,
  uidA: string,
  uidB: string,
  ceremony: Ceremony,
  nominations: Nomination[],
): Promise<string[]> {
  const unlocked: string[] = [];
  const w = ceremony.winners ?? {};
  const ceremonyNoms = nominations.filter((n) => n.ceremonyId === ceremony.id);
  const categoryIdsWithNoms = [...new Set(ceremonyNoms.map((n) => n.category))];

  if (categoryIdsWithNoms.length > 0) {
    const allWon = categoryIdsWithNoms.every((id) => !!w[id]);
    if (allWon) {
      const nomineeIds = categoryIdsWithNoms.map((id) => w[id]!.nomineeId);
      const first = nomineeIds[0];
      if (first && nomineeIds.every((id) => id === first)) {
        unlocked.push(...(await grantToBoth(uidA, uidB, ['clean_sweep'])));
      }
    }
  }

  const completeSnap = await getDocs(
    query(
      ceremoniesCol(),
      where('coupleId', '==', coupleId),
      where('status', '==', 'complete'),
    ),
  );
  const completeCeremonies = completeSnap.docs.map((d) => d.data() as Ceremony);
  if (completeCeremonies.length >= 2) {
    unlocked.push(...(await grantToBoth(uidA, uidB, ['back_to_back'])));
  }

  const vaultCount = completeCeremonies.length;
  const vaultIds: string[] = [];
  for (const t of SEASONS_VAULT_COUPLE_TIERS) {
    if (vaultCount >= t.count) vaultIds.push(t.id);
  }
  if (vaultIds.length) unlocked.push(...(await grantToBoth(uidA, uidB, vaultIds)));

  const winsByUid = aggregateCategoryWinsByUid(completeCeremonies, uidA, uidB);
  const coupleDoc = await getCouple(coupleId);
  const nEnabled = coupleDoc
    ? enabledAwardCategoryIds(mergeCoupleAwardCategoryDefaults(coupleDoc).awardCategories ?? []).length
    : 0;

  for (const uid of [uidA, uidB]) {
    const row = winsByUid[uid] ?? {};
    const ids: string[] = [];
    for (const cat of Object.keys(row)) {
      if ((row[cat] ?? 0) >= 1) ids.push(winBadgeIdForCategory(cat));
    }
    const counts = Object.values(row);
    const maxInOneCategory = counts.length ? Math.max(...counts) : 0;
    if (maxInOneCategory >= 3) ids.push('category_threepeat');
    const distinctWon = Object.keys(row).filter((k) => (row[k] ?? 0) >= 1).length;
    if (nEnabled > 0 && distinctWon >= nEnabled) ids.push('all_seven_crowns');
    if (ids.length) unlocked.push(...(await mergeBadges(uid, ids)));
  }

  return [...new Set(unlocked)];
}

const HABIT_PERSONAL_STREAK_BADGES: { min: number; id: string }[] = [
  { min: 7, id: 'habit_week' },
  { min: 30, id: 'habit_month' },
  { min: 90, id: 'habit_quarter' },
];

/** Personal + joint habit streak thresholds (idempotent via mergeBadges / grantToBoth). */
export async function evaluateHabitStreakBadges(
  uidA: string,
  uidB: string,
  streakA: number,
  streakB: number,
  jointStreak: number,
): Promise<string[]> {
  const unlocked: string[] = [];
  const packs: [string, number][] = [
    [uidA, streakA],
    [uidB, streakB],
  ];
  for (const [uid, s] of packs) {
    const ids: string[] = [];
    for (const { min, id } of HABIT_PERSONAL_STREAK_BADGES) {
      if (s >= min) ids.push(id);
    }
    if (ids.length) unlocked.push(...(await mergeBadgesSafe(uid, ids)));
  }
  if (jointStreak >= 7) unlocked.push(...(await grantToBoth(uidA, uidB, ['habit_pair_week'])));
  if (jointStreak >= 30) unlocked.push(...(await grantToBoth(uidA, uidB, ['habit_pair_month'])));
  return [...new Set(unlocked)];
}

/**
 * Mood v2 badges. Evaluates after each mood entry write.
 */
export async function evaluateNewMoodBadges(
  actingUid: string,
  partnerUid: string | null,
  isFirstEver: boolean,
  bothLoggedToday: boolean,
  bothMatchToday: boolean,
  actingQuadrants: Set<string>,
  bothLoggedDayCount: number,
): Promise<string[]> {
  const unlocked: string[] = [];

  const authorIds: string[] = [];
  if (isFirstEver) authorIds.push('mood_open');
  if (actingQuadrants.size >= 4) authorIds.push('mood_rainbow_self');
  if (authorIds.length) {
    unlocked.push(...(await mergeBadges(actingUid, authorIds)));
  }

  if (!partnerUid) return [...new Set(unlocked)];

  if (bothLoggedToday) {
    unlocked.push(...(await grantToBoth(actingUid, partnerUid, ['mood_seen'])));
  }
  if (bothLoggedDayCount >= 3) {
    unlocked.push(...(await grantToBoth(actingUid, partnerUid, ['mood_duet_3'])));
  }
  if (bothLoggedDayCount >= 25) {
    unlocked.push(...(await grantToBoth(actingUid, partnerUid, ['mood_duet_25'])));
  }
  if (bothMatchToday) {
    unlocked.push(...(await grantToBoth(actingUid, partnerUid, ['mood_twin_first'])));
  }

  return [...new Set(unlocked)];
}

export async function evaluateFirstHabitBadge(actingUid: string, isFirstHabit: boolean): Promise<string[]> {
  if (!isFirstHabit) return [];
  return mergeBadges(actingUid, ['first_habit']);
}

export async function evaluateFirstCheckinBadge(actingUid: string, isFirstCheckin: boolean): Promise<string[]> {
  if (!isFirstCheckin) return [];
  return mergeBadges(actingUid, ['first_checkin']);
}

