/**
 * Recompute XP + badges for all linked users from Firestore data (Admin SDK).
 * Mirrors current rules in constants/levels, gamificationTriggers, gamificationBadges, gamification.ts.
 *
 * Not modeled (no durable history): weekly challenge, daily check-in on spins,
 * contested resolution XP (per lock).
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=...
 *   npx tsx scripts/recompute-gamification.ts --dry-run
 *   npx tsx scripts/recompute-gamification.ts --confirm RECOMPUTE-GAMIFICATION
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  type DocumentSnapshot,
  type Timestamp,
} from 'firebase-admin/firestore';
import { XP_REWARDS, getLevelForXp } from '@/constants/levels';
import {
  AWARDS_FILED_TIERS,
  AWARDS_JAR_COUPLE_TIERS,
  AWARDS_PHOTO_COUPLE_TIERS,
  AWARDS_SPOTLIGHT_TIERS,
  BATTLE_DECISION_TIERS,
  SEASONS_VAULT_COUPLE_TIERS,
} from '@/constants/awardsBadgeTiers';
import { REASONS_LINE_COUNT_BADGES, REASONS_STREAK_DAY_BADGES } from '@/constants/reasonsBadgeTiers';
import { ALL_DECISIONS_COUPLE_TIERS, QUICKSPIN_COUPLE_TIERS } from '@/constants/decideBadgeTiers';
import { enabledAwardCategoryIds, mergeCoupleAwardCategoryDefaults } from '@/lib/awardCategoryConfig';
import { deliberationDisagreementCount, categoriesWithNominations } from '@/lib/awardsLogic';
import type { Ceremony, Couple, Nomination, Reason } from '@/types';

const CONFIRM = 'RECOMPUTE-GAMIFICATION';

function ms(t: Timestamp | undefined): number {
  if (!t || typeof t.toMillis !== 'function') return 0;
  return t.toMillis();
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function previousLocalDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() - 1);
  return localDayKey(dt);
}

function nextStreakValue(
  lastKey: string | null,
  todayKey: string,
  current: number,
): { streak: number; bumped: boolean } {
  if (lastKey === todayKey) return { streak: current, bumped: false };
  if (lastKey === null) return { streak: Math.max(1, current || 1), bumped: true };
  const yest = previousLocalDayKey(todayKey);
  if (lastKey === yest) return { streak: current + 1, bumped: true };
  return { streak: 1, bumped: true };
}

function isUserAuthoredNomination(n: Nomination): boolean {
  return n.seeded !== true;
}

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

type Args = { dryRun: boolean; confirm: string | null; coupleId: string | null };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let confirm: string | null = null;
  let coupleId: string | null = null;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--confirm' && a[i + 1]) confirm = a[++i]!;
    if (a[i] === '--couple-id' && a[i + 1]) coupleId = a[++i]!;
  }
  return { dryRun: a.includes('--dry-run'), confirm, coupleId };
}

async function main() {
  const args = parseArgs();
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }
  if (!args.dryRun && args.confirm !== CONFIRM) {
    console.error(`Pass --dry-run or --confirm ${CONFIRM}`);
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  }
  const db = getFirestore();

  const coupleDocs: DocumentSnapshot[] = [];
  if (args.coupleId) {
    const one = await db.collection('couples').doc(args.coupleId).get();
    if (one.exists) coupleDocs.push(one);
  } else {
    const all = await db.collection('couples').get();
    all.forEach((d) => coupleDocs.push(d));
  }

  for (const cdoc of coupleDocs) {
    const couple = { id: cdoc.id, ...cdoc.data() } as Couple;
    const uidA = couple.user1Id;
    const uidB = couple.user2Id;
    const coupleId = couple.id;

    const [decSnap, nomSnap, reasonSnap, cerSnap] = await Promise.all([
      db.collection('decisions').where('coupleId', '==', coupleId).get(),
      db.collection('nominations').where('coupleId', '==', coupleId).get(),
      db.collection('reasons').where('coupleId', '==', coupleId).get(),
      db.collection('ceremonies').where('coupleId', '==', coupleId).get(),
    ]);

    const decisions = decSnap.docs.map((d) => d.data() as Record<string, unknown> & { id: string });
    const nominations = nomSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Nomination);
    const reasons = reasonSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reason);
    const ceremonies = cerSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ceremony);

    const xp: Record<string, number> = { [uidA]: 0, [uidB]: 0 };
    const badgesA = new Set<string>();
    const badgesB = new Set<string>();

    const coupleMerged = mergeCoupleAwardCategoryDefaults(couple);
    const enabledIds = enabledAwardCategoryIds(coupleMerged.awardCategories ?? []);
    const nEnabled = enabledIds.length;

    // —— Decisions: quick spin + battle ——
    let spinCount = 0;
    let battleCount = 0;
    let allDecisions = 0;
    let foodCount = 0;
    let movieCount = 0;
    for (const d of decisions) {
      allDecisions += 1;
      const mode = d.mode as string;
      if (mode === 'quickspin') {
        spinCount += 1;
        const actor = d.createdByUserId as string | undefined;
        if (actor === uidA || actor === uidB) xp[actor] += XP_REWARDS.decision_made;
        else {
          xp[uidA] += XP_REWARDS.decision_made;
          xp[uidB] += XP_REWARDS.decision_made;
        }
      }
      if (mode === 'battle') battleCount += 1;
      if (d.category === 'food') foodCount += 1;
      if (d.category === 'movie') movieCount += 1;
    }
    xp[uidA] += XP_REWARDS.decision_made * battleCount;
    xp[uidB] += XP_REWARDS.decision_made * battleCount;

    // Decide badges (couple)
    const coupleDecide = new Set<string>();
    if (spinCount >= 1) coupleDecide.add('first_spin');
    for (const t of QUICKSPIN_COUPLE_TIERS) {
      if (spinCount >= t.count) coupleDecide.add(t.id);
    }
    for (const t of ALL_DECISIONS_COUPLE_TIERS) {
      if (allDecisions >= t.count) coupleDecide.add(t.id);
    }
    if (allDecisions >= 100) coupleDecide.add('decisive');
    if (foodCount >= 50) coupleDecide.add('foodie');
    if (movieCount >= 20) coupleDecide.add('night_in');
    for (const t of BATTLE_DECISION_TIERS) {
      if (battleCount >= t.count) coupleDecide.add(t.id);
    }
    for (const id of coupleDecide) {
      badgesA.add(id);
      badgesB.add(id);
    }

    // —— Nominations ——
    const authored = nominations.filter(isUserAuthoredNomination).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
    const firstInCat = new Set<string>();
    let subA = 0;
    let subB = 0;
    let spotA = 0;
    let spotB = 0;
    for (const n of authored) {
      xp[n.submittedBy] += XP_REWARDS.nomination_added;
      const key = `${n.ceremonyId}\0${n.category}`;
      if (!firstInCat.has(key)) {
        firstInCat.add(key);
        xp[n.submittedBy] += XP_REWARDS.first_nomination_in_category;
      }
      if (n.submittedBy === uidA) subA += 1;
      if (n.submittedBy === uidB) subB += 1;
      if (n.nomineeId === 'both') {
        spotA += 1;
        spotB += 1;
      } else if (n.nomineeId === uidA) spotA += 1;
      else if (n.nomineeId === uidB) spotB += 1;
    }

    const pushFiled = (uid: string, submitted: number) => {
      const set = uid === uidA ? badgesA : badgesB;
      for (const t of AWARDS_FILED_TIERS) {
        if (submitted >= t.count) set.add(t.id);
      }
    };
    const pushSpot = (uid: string, spotlight: number) => {
      const set = uid === uidA ? badgesA : badgesB;
      for (const t of AWARDS_SPOTLIGHT_TIERS) {
        if (spotlight >= t.count) set.add(t.id);
      }
    };
    pushFiled(uidA, subA);
    pushFiled(uidB, subB);
    pushSpot(uidA, spotA);
    pushSpot(uidB, spotB);

    const jarIds: string[] = [];
    for (const t of AWARDS_JAR_COUPLE_TIERS) {
      if (authored.length >= t.count) jarIds.push(t.id);
    }
    const photoCount = authored.filter((n) => n.photoUrl && String(n.photoUrl).trim()).length;
    const photoIds: string[] = [];
    for (const t of AWARDS_PHOTO_COUPLE_TIERS) {
      if (photoCount >= t.count) photoIds.push(t.id);
    }
    for (const id of jarIds) {
      badgesA.add(id);
      badgesB.add(id);
    }
    for (const id of photoIds) {
      badgesA.add(id);
      badgesB.add(id);
    }

    // category_completionist + early_bird (per ceremony, once)
    for (const cer of ceremonies) {
      const seasonNoms = authored.filter((n) => n.ceremonyId === cer.id);
      const cats = new Set(seasonNoms.map((n) => n.category));
      const allEnabledHaveNom = nEnabled > 0 && enabledIds.every((id) => cats.has(id));
      if (allEnabledHaveNom) {
        badgesA.add('category_completionist');
        badgesB.add('category_completionist');
        const msLeft = ms(cer.periodEnd) - Date.now();
        if (msLeft > 60 * 86400000) {
          badgesA.add('early_bird');
          badgesB.add('early_bird');
        }
      }
    }

    // —— Ceremonies: deliberation XP, completion XP + ceremony badges ——
    const completeSorted = ceremonies
      .filter((c) => c.status === 'complete')
      .sort((a, b) => ms(a.periodEnd) - ms(b.periodEnd));

    for (const cer of ceremonies) {
      if (cer.picksSubmitted?.[uidA]) xp[uidA] += XP_REWARDS.deliberation_picks_submitted;
      if (cer.picksSubmitted?.[uidB]) xp[uidB] += XP_REWARDS.deliberation_picks_submitted;
      if (cer.picksSubmitted?.[uidA]) badgesA.add('first_alignment_sheet');
      if (cer.picksSubmitted?.[uidB]) badgesB.add('first_alignment_sheet');
    }

    let openingNightAssigned = false;
    let fullAgreementGranted = false;
    let overtimeGranted = false;
    for (const cer of completeSorted) {
      const seasonNoms = nominations.filter((n) => n.ceremonyId === cer.id);
      const disagreements = deliberationDisagreementCount(cer, seasonNoms, uidA, uidB, enabledIds);
      const catWithNoms = categoriesWithNominations(seasonNoms, enabledIds).length;
      const fullAgreementEligible = catWithNoms > 0 && disagreements === 0;
      const overtimeEarned = disagreements >= 3;

      xp[uidA] += XP_REWARDS.ceremony_completed;
      xp[uidB] += XP_REWARDS.ceremony_completed;

      if (!openingNightAssigned) {
        badgesA.add('opening_night');
        badgesB.add('opening_night');
        openingNightAssigned = true;
      }
      if (fullAgreementEligible && !fullAgreementGranted) {
        badgesA.add('full_agreement');
        badgesB.add('full_agreement');
        fullAgreementGranted = true;
      }
      if (overtimeEarned && !overtimeGranted) {
        badgesA.add('overtime');
        badgesB.add('overtime');
        overtimeGranted = true;
      }
    }

    if (completeSorted.length >= 2) {
      badgesA.add('back_to_back');
      badgesB.add('back_to_back');
    }

    const vaultCount = completeSorted.length;
    for (const t of SEASONS_VAULT_COUPLE_TIERS) {
      if (vaultCount >= t.count) {
        badgesA.add(t.id);
        badgesB.add(t.id);
      }
    }

    // clean_sweep, crowns, threepeat, all_seven — use last complete ceremony for clean_sweep check (same as app batch per season)
    for (const cer of completeSorted) {
      const w = cer.winners ?? {};
      const ceremonyNoms = nominations.filter((n) => n.ceremonyId === cer.id);
      const categoryIdsWithNoms = [...new Set(ceremonyNoms.map((n) => n.category))];
      if (categoryIdsWithNoms.length > 0) {
        const allWon = categoryIdsWithNoms.every((id) => !!w[id as keyof typeof w]);
        if (allWon) {
          const nomineeIds = categoryIdsWithNoms.map((id) => w[id]!.nomineeId);
          const first = nomineeIds[0];
          if (first && nomineeIds.every((id) => id === first)) {
            badgesA.add('clean_sweep');
            badgesB.add('clean_sweep');
          }
        }
      }
    }

    const winsByUid = aggregateCategoryWinsByUid(completeSorted, uidA, uidB);
    for (const uid of [uidA, uidB]) {
      const set = uid === uidA ? badgesA : badgesB;
      const row = winsByUid[uid] ?? {};
      for (const cat of Object.keys(row)) {
        if ((row[cat] ?? 0) >= 1) set.add(winBadgeIdForCategory(cat));
      }
      const counts = Object.values(row);
      const maxInOneCategory = counts.length ? Math.max(...counts) : 0;
      if (maxInOneCategory >= 3) set.add('category_threepeat');
      const distinctWon = Object.keys(row).filter((k) => (row[k] ?? 0) >= 1).length;
      if (nEnabled > 0 && distinctWon >= nEnabled) set.add('all_seven_crowns');
    }

    // —— Reasons ——
    const sortedReasons = [...reasons].sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
    let lastReasonDayKey: string | null = null;
    let reasonStreakVal = 0;
    let streakBumps = 0;
    for (const r of sortedReasons) {
      const created = (r.createdAt as Timestamp).toDate();
      const todayKey = localDayKey(created);
      const { streak, bumped } = nextStreakValue(lastReasonDayKey, todayKey, reasonStreakVal);
      reasonStreakVal = streak;
      lastReasonDayKey = todayKey;
      if (bumped) streakBumps += 1;
      xp[r.authorId] += XP_REWARDS.reason_written;
    }
    xp[uidA] += XP_REWARDS.reason_streak_day * streakBumps;
    xp[uidB] += XP_REWARDS.reason_streak_day * streakBumps;

    for (const t of REASONS_STREAK_DAY_BADGES) {
      if (reasonStreakVal >= t.days) {
        badgesA.add(t.id);
        badgesB.add(t.id);
      }
    }

    const reasonsA = reasons.filter((r) => r.authorId === uidA);
    const reasonsB = reasons.filter((r) => r.authorId === uidB);
    const aAboutB = reasonsA.some((r) => r.aboutId === uidB);
    const bAboutA = reasonsB.some((r) => r.aboutId === uidA);
    if (aAboutB && bAboutA) {
      badgesA.add('both_pouring');
      badgesB.add('both_pouring');
    }

    const pushAuthor = (uid: string, list: Reason[]) => {
      const set = uid === uidA ? badgesA : badgesB;
      const n = list.length;
      if (n >= 1) set.add('first_quill');
      for (const t of REASONS_LINE_COUNT_BADGES) {
        if (n >= t.lines) set.add(t.id);
      }
      if (n >= 3) {
        const times = list.map((r) => ms(r.createdAt));
        if (hasThreeConsecutiveMonthsWithReason(times)) set.add('dedicated');
      }
    };
    pushAuthor(uidA, reasonsA);
    pushAuthor(uidB, reasonsB);

    const levelA = getLevelForXp(xp[uidA]).level;
    const levelB = getLevelForXp(xp[uidB]).level;

    console.log(
      JSON.stringify(
        {
          coupleId,
          uidA,
          uidB,
          xp: { [uidA]: xp[uidA], [uidB]: xp[uidB] },
          badgeCounts: { [uidA]: badgesA.size, [uidB]: badgesB.size },
          level: { [uidA]: levelA, [uidB]: levelB },
        },
        null,
        2,
      ),
    );

    if (!args.dryRun) {
      const batch = db.batch();
      batch.set(
        db.collection('users').doc(uidA),
        {
          xp: xp[uidA],
          level: levelA,
          badges: [...badgesA].sort(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      batch.set(
        db.collection('users').doc(uidB),
        {
          xp: xp[uidB],
          level: levelB,
          badges: [...badgesB].sort(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      await batch.commit();
      console.log(`Committed recomputed gamification for couple ${coupleId}`);
    }
  }

  if (args.dryRun) console.log('Dry run — no writes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
