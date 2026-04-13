import { Couple, Nomination, UserProfile } from '@/types';

/** Per-category counts for the season calendar (all rows in `nominations`, same as awards hub). */
export function nominationCountsByCategory(
  nominations: Nomination[],
  categoryIds: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of categoryIds) out[c] = 0;
  for (const n of nominations) {
    out[n.category] = (out[n.category] ?? 0) + 1;
  }
  return out;
}

export function nominationCountsByPartner(
  nominations: Nomination[],
  uidA: string,
  uidB: string,
): { a: number; b: number; other: number } {
  let a = 0;
  let b = 0;
  let other = 0;
  for (const n of nominations) {
    if (n.submittedBy === uidA) a++;
    else if (n.submittedBy === uidB) b++;
    else other++;
  }
  return { a, b, other };
}

/**
 * Partner Firebase uid for stats: prefer `profile.partnerId`, else infer from `couple` + `profile.uid`.
 */
export function resolvePartnerUid(profile: UserProfile | null, couple: Couple | null): string | null {
  if (profile?.partnerId) return profile.partnerId;
  if (!profile?.uid || !couple) return null;
  if (couple.user1Id === profile.uid) return couple.user2Id;
  if (couple.user2Id === profile.uid) return couple.user1Id;
  return null;
}

/** Who wrote the nomination — bucketed for the signed-in viewer (matches Firestore `submittedBy`). */
export function submissionCountsForViewer(
  nominations: Nomination[],
  myUid: string | null,
  partnerUid: string | null,
): { mine: number; partner: number; other: number } {
  let mine = 0;
  let partner = 0;
  let other = 0;
  if (!myUid) {
    return { mine: 0, partner: 0, other: nominations.length };
  }
  for (const n of nominations) {
    if (n.submittedBy === myUid) mine++;
    else if (partnerUid && n.submittedBy === partnerUid) partner++;
    else other++;
  }
  return { mine, partner, other };
}

/** Who the story is about (`nomineeId`): you, partner, or both (season display; all rows). */
export function nomineeSpotlightCounts(
  nominations: Nomination[],
  myUid: string | null,
  partnerUid: string | null,
): { forYou: number; forPartner: number; both: number; other: number } {
  let forYou = 0;
  let forPartner = 0;
  let both = 0;
  let other = 0;
  for (const n of nominations) {
    if (n.nomineeId === 'both') {
      both++;
      continue;
    }
    if (!myUid) {
      other++;
      continue;
    }
    if (n.nomineeId === myUid) forYou++;
    else if (partnerUid && n.nomineeId === partnerUid) forPartner++;
    else other++;
  }
  return { forYou, forPartner, both, other };
}

export function maxCategoryCount(counts: Record<string, number>): number {
  const vals = Object.values(counts);
  return vals.length ? Math.max(0, ...vals) : 0;
}

/** Short playful line for the partner split card (no guilt — light tone). `mine` = your submissions. */
export function partnerNominationVibe(mine: number, theirs: number): string {
  const t = mine + theirs;
  if (t === 0) return 'first nomination wins the bragging rights';
  if (mine === 0 && theirs > 0) return 'your turn to drop a story';
  if (theirs === 0 && mine > 0) return 'nudge them — variety makes picks easier';
  const ratio = mine / theirs;
  if (ratio > 1.35) return 'you’re carrying the clipboard this season';
  if (ratio < 1 / 1.35) return 'they’re on a nomination streak';
  if (Math.abs(mine - theirs) <= 1) return 'even split — nice teamwork';
  return 'both in the mix';
}

/** Highlight category with the most noms; `tieBreakOrder` picks first among ties (e.g. enabled list order). */
export function hottestCategoryId(
  counts: Record<string, number>,
  tieBreakOrder: string[],
): string | null {
  let bestN = -1;
  for (const id of tieBreakOrder) {
    const n = counts[id] ?? 0;
    if (n > bestN) bestN = n;
  }
  if (bestN <= 0) return null;
  for (const id of tieBreakOrder) {
    if ((counts[id] ?? 0) === bestN) return id;
  }
  return null;
}
