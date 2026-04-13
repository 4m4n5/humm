/**
 * Reasons (love notes) badges — expanding gaps: rewards cluster early, then space out (caps at 15).
 * Streak = consecutive local days with at least one couple reason. Lines = your authored reasons for them.
 *
 * Badge `id` strings stay `because_*` for compatibility with existing `users.badges` arrays in Firestore.
 */

function expandingGapTotals(firstGap: number, maxGap: number, tierCount: number): number[] {
  const out: number[] = [];
  let sum = 0;
  let gap = firstGap;
  for (let i = 0; i < tierCount; i++) {
    sum += gap;
    out.push(sum);
    gap = Math.min(maxGap, gap + 1);
  }
  return out;
}

/** Gaps between line-count tiers after your first reason: 3,4,5,… up to 15 */
function lineCountThresholds(tierCount: number): number[] {
  const gaps: number[] = [];
  let g = 3;
  for (let i = 0; i < tierCount; i++) {
    gaps.push(g);
    g = Math.min(15, g + 1);
  }
  let total = 1;
  return gaps.map((gap) => {
    total += gap;
    return total;
  });
}

const STREAK_DAYS = expandingGapTotals(5, 15, 9);
const LINE_COUNTS = lineCountThresholds(9);

export type ReasonsStreakTierMeta = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

/** Couple reasons streak — both get each tier */
export const REASONS_STREAK_DAY_BADGES: (ReasonsStreakTierMeta & { days: number })[] = [
  {
    days: STREAK_DAYS[0]!,
    id: 'because_days_5',
    name: 'spark row',
    description: '5 straight days — a reason from one of you each day',
    emoji: '✨',
  },
  {
    days: STREAK_DAYS[1]!,
    id: 'because_days_11',
    name: 'kindling',
    description: '11-day reasons streak together',
    emoji: '🔥',
  },
  {
    days: STREAK_DAYS[2]!,
    id: 'because_days_18',
    name: 'warm stretch',
    description: '18-day streak — you’re really showing up',
    emoji: '🌤️',
  },
  {
    days: STREAK_DAYS[3]!,
    id: 'because_days_26',
    name: 'steady glow',
    description: '26 days in a row on the calendar',
    emoji: '💡',
  },
  {
    days: STREAK_DAYS[4]!,
    id: 'because_days_35',
    name: 'hearth habit',
    description: '35-day reasons streak',
    emoji: '🏠',
  },
  {
    days: STREAK_DAYS[5]!,
    id: 'because_days_45',
    name: 'long burn',
    description: '45 days — the loop is sticking',
    emoji: '🕯️',
  },
  {
    days: STREAK_DAYS[6]!,
    id: 'because_days_56',
    name: 'deep current',
    description: '56-day streak together',
    emoji: '🌊',
  },
  {
    days: STREAK_DAYS[7]!,
    id: 'because_days_68',
    name: 'tide locked',
    description: '68 straight days with a new reason',
    emoji: '🌙',
  },
  {
    days: STREAK_DAYS[8]!,
    id: 'because_days_81',
    name: 'season of reasons',
    description: '81-day streak — legendary rhythm',
    emoji: '⭐',
  },
];

/** Your reasons for them — author only */
export const REASONS_LINE_COUNT_BADGES: (ReasonsStreakTierMeta & { lines: number })[] = [
  {
    lines: LINE_COUNTS[0]!,
    id: 'because_lines_4',
    name: 'four beats',
    description: '4 reasons saved for them',
    emoji: '💗',
  },
  {
    lines: LINE_COUNTS[1]!,
    id: 'because_lines_8',
    name: 'eight echoes',
    description: '8 reasons — early momentum',
    emoji: '🎵',
  },
  {
    lines: LINE_COUNTS[2]!,
    id: 'because_lines_13',
    name: 'thirteen threads',
    description: '13 reasons for them',
    emoji: '🥐',
  },
  {
    lines: LINE_COUNTS[3]!,
    id: 'because_lines_19',
    name: 'nineteen notes',
    description: '19 reasons in the jar',
    emoji: '🎼',
  },
  {
    lines: LINE_COUNTS[4]!,
    id: 'because_lines_26',
    name: 'twenty-six petals',
    description: '26 reasons — you mean it',
    emoji: '🌸',
  },
  {
    lines: LINE_COUNTS[5]!,
    id: 'because_lines_34',
    name: 'thirty-four beats',
    description: '34 reasons for them',
    emoji: '📖',
  },
  {
    lines: LINE_COUNTS[6]!,
    id: 'because_lines_43',
    name: 'forty-three layers',
    description: '43 reasons deep',
    emoji: '📚',
  },
  {
    lines: LINE_COUNTS[7]!,
    id: 'because_lines_53',
    name: 'fifty-three whispers',
    description: '53 reasons — serious archive',
    emoji: '🤫',
  },
  {
    lines: LINE_COUNTS[8]!,
    id: 'because_lines_64',
    name: 'sixty-four bars',
    description: '64 reasons for them — poet energy',
    emoji: '🖋️',
  },
];
