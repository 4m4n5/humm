import { STARTER_NOMINATION_SUBMITTED_BY } from '@/constants/starterNominations';
import { Couple, UserProfile } from '@/types';

/** Other user in the couple when `profile.partnerId` is missing (legacy / drift). */
function partnerUidFromCouple(profile: UserProfile, couple: Couple): string | null {
  if (couple.user1Id === profile.uid) return couple.user2Id;
  if (couple.user2Id === profile.uid) return couple.user1Id;
  return null;
}

export function nomineeShortLabel(
  nomineeId: string | 'both',
  profile: UserProfile | null,
  couple?: Couple | null,
  partnerName = 'partner',
): string {
  if (!profile) return 'someone';
  if (nomineeId === 'both') return 'both';
  if (nomineeId === profile.uid) return 'you';
  if (profile.partnerId && nomineeId === profile.partnerId) return partnerName;
  if (couple) {
    const inferred = partnerUidFromCouple(profile, couple);
    if (inferred && nomineeId === inferred) return partnerName;
  }
  return partnerName;
}

export function authorShortLabel(
  submittedBy: string,
  profile: UserProfile | null,
  couple?: Couple | null,
  partnerName = 'partner',
): string {
  if (!profile) return 'someone';
  if (submittedBy === STARTER_NOMINATION_SUBMITTED_BY) return 'Hum';
  if (submittedBy === profile.uid) return 'you';
  if (profile.partnerId && submittedBy === profile.partnerId) return partnerName;
  if (couple) {
    const inferred = partnerUidFromCouple(profile, couple);
    if (inferred && submittedBy === inferred) return partnerName;
  }
  return partnerName;
}
