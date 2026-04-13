import type { Nomination } from '@/types';

/** True for nominations that should earn XP / count toward user submission & badge tallies. */
export function isUserAuthoredNomination(n: Nomination): boolean {
  return n.seeded !== true;
}
