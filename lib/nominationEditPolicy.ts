import { STARTER_NOMINATION_SUBMITTED_BY } from '@/constants/starterNominations';
import type { Ceremony, Couple, Nomination } from '@/types';

function isStarterNomination(n: Nomination): boolean {
  return n.seeded === true || n.submittedBy === STARTER_NOMINATION_SUBMITTED_BY;
}

/** Nominations can be edited only during the nominating phase (picks not locked yet). */
export function canEditNomination(
  n: Nomination,
  uid: string | null,
  couple: Couple | null,
  ceremony: Ceremony | null,
): boolean {
  if (!uid || !couple || !ceremony) return false;
  if (ceremony.status !== 'nominating') return false;
  if (n.ceremonyId !== ceremony.id || n.coupleId !== couple.id) return false;
  if (isStarterNomination(n)) {
    return uid === couple.user1Id || uid === couple.user2Id;
  }
  return n.submittedBy === uid;
}
