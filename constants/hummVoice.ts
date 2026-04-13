/**
 * Shared UI voice for humm: lowercase, warm, light metaphors.
 * Prefer short fragments; lean on UI (chips, color, layout) over prose.
 *
 * Award ceremony product names vs Firestore: ../docs/CEREMONY_TERMINOLOGY.md
 */

import type { CeremonyStatus } from '@/types';

/** Legacy hook for docs / tooling — awards hub uses phase strip + cards instead. */
export function ceremonyHubPhaseHint(
  status: CeremonyStatus | undefined,
  revealUnlocked: boolean,
): string {
  if (!status || status === 'nominating') return 'nominate · align when ready';
  if (status === 'deliberating') return 'private picks · then overlap';
  if (status === 'voting') {
    if (revealUnlocked) return 'agreed winners · cheer when ready';
    return 'sync splits · then cheer';
  }
  if (status === 'complete') return 'in the vault · start fresh anytime';
  return '';
}

export const awardsVoice = {
  screenSubtitle: 'celebrate the goods',
  startAlignmentTitle: 'start alignment?',
  startAlignmentBody:
    'private picks · one per category with stories\nboth done → overlap\n(every active category needs a story first)',
  overlapPrimary: 'see the overlap',
  resolvePrimary: 'sync split picks',
  revealPrimary: 'start cheering',
  votingHintContested: (n: number) =>
    n === 1 ? 'one category · same tap from both · then cheer' : `${n} categories · same tap · then cheer`,
  votingHintSync: 'check overlap for what’s left',
  alignPickerHint: (_name: string) => 'one winner per category · hidden until both submit',
  overlapScreenHint: '✓ match · ◇ split',
  resolveScreenHint: (name: string) => `same card as ${name} · locks`,
  cheerScreenHint: 'together · last card → vault',
} as const;

export const reasonsVoice = {
  screenSubtitle: '1 for them · 3 for you',
  waitingOnPartnerTitle: (name: string) => `when ${name} writes about you`,
  waitingOnPartnerBody: 'your trio opens here',
  writeFirstTitle: (name: string) => `one reason for ${name}`,
  writeFirstBody: 'then three about you appear',
  readyHeroTitle: 'your turn',
  readyHeroBody: 'write · draw three',
  writeAgainTitle: (name: string) => `something new for ${name}`,
  writeAgainBody: '',
  rewardCardsTitle: 'three for you',
  rewardCardsSubtitle: (name: string) => `from ${name}`,
  rewardMomentHint: 'saved for them',
  primaryWriteFor: (name: string) => `write for ${name}`,
  writeAnotherFor: (name: string) => `write another for ${name}`,
  listForPartnerEyebrow: (name: string) => `by you · ${name}`,
  listForPartnerEmpty: 'nothing yet',
} as const;
