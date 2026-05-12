/**
 * Shared UI voice for Hum: lowercase, warm, light metaphors.
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
  startAlignmentTitle: 'start alignment?',
  startAlignmentBody:
    'private picks · both done → overlap',
  overlapPrimary: 'see the overlap',
  resolvePrimary: 'sync split picks',
  revealPrimary: 'start cheering',
  votingHintContested: (n: number) =>
    n === 1 ? 'one split · same tap to cheer' : `${n} splits · same tap to cheer`,
  votingHintSync: 'check overlap',
  alignPickerHint: (_name: string) => 'one per category · hidden till both done',
  overlapScreenHint: '\u2713 match \u00b7 \u25c7 split',
  resolveScreenHint: (name: string) => `match ${name} \u00b7 locks`,
  cheerScreenHint: 'together · last card → vault',
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

/**
 * Shared error toasts. Convention:
 *   title = what failed (`couldn\u2019t <verb>`)
 *   body  = what's preserved + next step (one short fragment, middle-dot separator)
 *
 * Source: NN/g UX Writing Study Guide (consistency #4); Unicorn Club 2026
 * "Avoid \u00b7 Explain \u00b7 Resolve" framework for error microcopy.
 */
export const errorsVoice = {
  // Titles \u2014 always `couldn\u2019t <verb>` to keep one error voice across the app.
  couldnt: (verb: string) => `couldn\u2019t ${verb}`,
  couldntSave: 'couldn\u2019t save',
  couldntStart: 'couldn\u2019t start',
  couldntAdd: 'couldn\u2019t add',
  couldntRemove: 'couldn\u2019t remove',
  couldntUpdate: 'couldn\u2019t update',
  couldntFinish: 'couldn\u2019t finish',
  couldntPick: 'couldn\u2019t pick',
  couldntLeave: 'couldn\u2019t leave',
  couldntLink: 'couldn\u2019t link',
  couldntReset: 'couldn\u2019t reset',
  couldntEnable: 'couldn\u2019t enable',
  couldntOpen: (what: string) => `couldn\u2019t open ${what}`,

  // Bodies \u2014 always middle-dot separator, never comma/em-dash.
  tryAgain: 'try again',
  tryAgainLater: 'try again in a moment',
  checkConnection: 'check connection \u00b7 try again',
  permissions: 'permissions issue \u00b7 try again later',

  // Validation prompts (used in pre-submit alerts, lowercase fragment).
  needTitle: 'a few words help you find it later',
  needText: 'even one honest reason is enough',
  needName: 'we need something to call you',
  needEmail: 'drop the address you\u2019ll sign in with',
  needPassword: 'we need it to confirm it\u2019s really you',
} as const;

/**
 * Shared navigation labels. Convention: ghost back-buttons at the bottom of
 * a screen are *terminus / destination* affordances \u2014 always name the
 * destination. The header chevron handles step-back navigation.
 *
 * Source: Apple HIG \u2014 \u201cAvoid stacking redundant navigation controls.\u201d
 */
export const navVoice = {
  backTo: (destination: string) => `back to ${destination}`,
  cancel: 'cancel',
  done: 'done',
  stay: 'stay',
  goBack: 'go back', // intentionally NOT exported as a button label \u2014 deprecated.
} as const;

/** Decide-feature voice: the verb family is `decide \u2192 vote \u2192 randomize`. */
export const decideVoice = {
  primaryAction: 'decide together',
  randomizeAction: 'randomize',
  resumeAction: 'resume',
  startAction: 'start',
  leaveAction: 'leave',
  saveResultAction: 'save this one',
  startOverAction: 'start over',
  leavePickTitle: 'leave this pick?',
  leavePickBody: 'open a fresh one anytime \u00b7 nothing saves to history',
  randomizeConfirmTitle: 'randomize?',
  randomizeConfirmBody: 'we\u2019ll pick from the pool \u00b7 no vote',
} as const;
