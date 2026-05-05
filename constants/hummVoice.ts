/**
 * Shared UI voice for Hum (store: "Hum - rituals"): lowercase, warm, light metaphors.
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
  if (!status || status === 'nominating') return 'nominate \u00b7 align when ready';
  if (status === 'deliberating') return 'private picks \u00b7 then overlap';
  if (status === 'voting') {
    if (revealUnlocked) return 'agreed winners \u00b7 cheer when ready';
    return 'sync splits \u00b7 then cheer';
  }
  if (status === 'complete') return 'in the vault \u00b7 start fresh anytime';
  return '';
}

export const awardsVoice = {
  screenSubtitle: 'celebrate the goods',
  startAlignmentTitle: 'start alignment?',
  startAlignmentBody:
    'private picks \u00b7 one per category with stories\nboth done \u2192 overlap\n(every active category needs a story first)',
  overlapPrimary: 'see the overlap',
  resolvePrimary: 'sync split picks',
  revealPrimary: 'start cheering',
  votingHintContested: (n: number) =>
    n === 1 ? 'one category \u00b7 same tap from both \u00b7 then cheer' : `${n} categories \u00b7 same tap \u00b7 then cheer`,
  votingHintSync: 'check overlap for what\u2019s left',
  alignPickerHint: (_name: string) => 'one winner per category \u00b7 hidden until both submit',
  overlapScreenHint: '\u2713 match \u00b7 \u25c7 split',
  resolveScreenHint: (name: string) => `same card as ${name} \u00b7 locks`,
  cheerScreenHint: 'together \u00b7 last card \u2192 vault',
} as const;

/** Relative-time copy used by `lib/relativeMoodTime`. */
export const moodVoice = {
  relativeJustNow: 'just now',
  relativeMinutes: (m: number) => (m === 1 ? 'a minute ago' : `${m} min ago`),
  relativeHours: (h: number) => (h === 1 ? 'an hour ago' : `${h} hr ago`),
  relativeToday: 'earlier today',
  relativeYesterday: 'yesterday',
  relativeOlder: (days: number) => `${days} days ago`,
} as const;

export const reasonsVoice = {
  screenSubtitle: '1 for them \u00b7 3 for you',
  waitingOnPartnerTitle: (name: string) => `when ${name} writes about you`,
  waitingOnPartnerBody: 'your trio opens here',
  writeFirstTitle: (name: string) => `one reason for ${name}`,
  writeFirstBody: 'then three about you appear',
  readyHeroTitle: 'your turn',
  readyHeroBody: 'write \u00b7 draw three',
  writeAgainTitle: (name: string) => `something new for ${name}`,
  writeAgainBody: '',
  rewardCardsTitle: 'three for you',
  rewardCardsSubtitle: (name: string) => `from ${name}`,
  rewardMomentHint: 'saved for them',
  primaryWriteFor: (name: string) => `write for ${name}`,
  writeAnotherFor: (name: string) => `write another for ${name}`,
  listForPartnerEyebrow: (name: string) => `by you \u00b7 ${name}`,
  listForPartnerEmpty: 'nothing yet',
} as const;
