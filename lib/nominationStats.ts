import type { Nomination } from '@/types';
import { isUserAuthoredNomination } from '@/lib/nominationSeeded';

/** Nominations you filed (submitted), excluding seeded rows — matches `AWARDS_FILED_TIERS` / profile “filed”. */
export function countAuthoredFiledByUid(nominations: Nomination[], uid: string): number {
  return nominations.filter((n) => isUserAuthoredNomination(n) && n.submittedBy === uid).length;
}

/**
 * Spotlight = story stars you or “both” (each `both` nom counts once for each partner).
 * Matches `evaluateNominatorNomineeBadges` / `AWARDS_SPOTLIGHT_TIERS` / profile “starred”.
 */
export function countAuthoredSpotlightForUid(nominations: Nomination[], uid: string): number {
  return nominations.filter(
    (n) => isUserAuthoredNomination(n) && (n.nomineeId === uid || n.nomineeId === 'both'),
  ).length;
}

/** Single pass over authored rows — same math as legacy `evaluateNominatorNomineeBadges` loop. */
export function tallyAuthoredNominatorNominee(
  nominations: Nomination[],
  uidA: string,
  uidB: string,
): {
  subA: number;
  subB: number;
  spotlightA: number;
  spotlightB: number;
} {
  let bothNom = 0;
  let subA = 0;
  let subB = 0;
  let nomA = 0;
  let nomB = 0;
  for (const n of nominations) {
    if (!isUserAuthoredNomination(n)) continue;
    if (n.nomineeId === 'both') bothNom++;
    if (n.submittedBy === uidA) subA++;
    if (n.submittedBy === uidB) subB++;
    if (n.nomineeId === uidA) nomA++;
    if (n.nomineeId === uidB) nomB++;
  }
  return {
    subA,
    subB,
    spotlightA: nomA + bothNom,
    spotlightB: nomB + bothNom,
  };
}

function tallyNomineeReceivedBreakdownCore(
  nominations: Nomination[],
  myUid: string,
  partnerUid: string | null,
  authoredOnly: boolean,
): { forYou: number; forPartner: number; both: number } {
  let forYou = 0;
  let forPartner = 0;
  let both = 0;
  for (const n of nominations) {
    if (authoredOnly && !isUserAuthoredNomination(n)) continue;
    if (n.nomineeId === 'both') both++;
    else if (n.nomineeId === myUid) forYou++;
    else if (partnerUid && n.nomineeId === partnerUid) forPartner++;
  }
  return { forYou, forPartner, both };
}

/** Profile jar infographic: every story row (matches awards browse; includes seeded). */
export function tallyNomineeReceivedBreakdown(
  nominations: Nomination[],
  myUid: string,
  partnerUid: string | null,
): { forYou: number; forPartner: number; both: number } {
  return tallyNomineeReceivedBreakdownCore(nominations, myUid, partnerUid, false);
}

/**
 * Authored-only nominee buckets (excludes `seeded`) — use where badge / XP rules must match.
 */
export function tallyAuthoredNomineeReceivedBreakdown(
  nominations: Nomination[],
  myUid: string,
  partnerUid: string | null,
): { forYou: number; forPartner: number; both: number } {
  return tallyNomineeReceivedBreakdownCore(nominations, myUid, partnerUid, true);
}
