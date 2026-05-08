/**
 * Awards hook badges: expanding gaps (early wins closer, later tiers wider; cap ~12–15).
 * Nomination “filed” = you submitted; “spotlight” = story starred you or both.
 */

function expandingTotals(firstGap: number, maxGap: number, tierCount: number): number[] {
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

export type AwardsTierMeta = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  count: number;
};

function zipCounts(
  counts: number[],
  prefix: string,
  names: { name: string; description: string; emoji: string }[],
): AwardsTierMeta[] {
  return counts.map((count, i) => ({
    count,
    id: `${prefix}_${count}`,
    name: names[i]!.name,
    description: names[i]!.description,
    emoji: names[i]!.emoji,
  }));
}

/** Per user — nominations you filed (all seasons) */
const FILED = expandingTotals(2, 12, 8);
export const AWARDS_FILED_TIERS: AwardsTierMeta[] = zipCounts(FILED, 'awards_filed', [
  { name: 'first handful', description: '2 nominations filed by you', emoji: '📝' },
  { name: 'jar warming', description: '5 stories you’ve put forward', emoji: '🫙' },
  { name: 'steady voice', description: '9 nominations with your name on them', emoji: '🎤' },
  { name: 'table regular', description: '14 filed — you keep the season moving', emoji: '☕' },
  { name: 'deep bench', description: '20 nominations from you', emoji: '📚' },
  { name: 'season scribe', description: '27 filed across seasons', emoji: '✍️' },
  { name: 'full jar', description: '35 of your nominations in the vault', emoji: '🏺' },
  { name: 'historian path', description: '45 filed — archive energy', emoji: '📜' },
]);

/** Per user — you or both starred in the story */
const SPOT = expandingTotals(2, 12, 8);
export const AWARDS_SPOTLIGHT_TIERS: AwardsTierMeta[] = zipCounts(SPOT, 'awards_spotlight', [
  { name: 'first spotlight', description: '2 times the story starred you or both', emoji: '✨' },
  { name: 'shared glow', description: '5 spotlight moments for you', emoji: '💡' },
  { name: 'feature run', description: '9 times you were in the frame', emoji: '🎬' },
  { name: 'center stage', description: '14 starring you or both', emoji: '🌟' },
  { name: 'headline habit', description: '20 spotlight picks', emoji: '📰' },
  { name: 'marquee', description: '27 times the nom was about you two', emoji: '🎭' },
  { name: 'main story', description: '35 spotlight beats', emoji: '💫' },
  { name: 'legacy lead', description: '45 times you shined in the nom', emoji: '🏅' },
]);

/** Couple — user-authored nominations across all seasons */
const JAR = expandingTotals(5, 15, 7);
export const AWARDS_JAR_COUPLE_TIERS: AwardsTierMeta[] = zipCounts(JAR, 'awards_jar', [
  { name: 'jar kicks off', description: '5 nominations between you — jar’s alive', emoji: '🫙' },
  { name: 'shared shelf', description: '11 stories in play together', emoji: '🗃️' },
  { name: 'season stack', description: '18 nominations on the record', emoji: '📚' },
  { name: 'full table', description: '26 filed as a pair', emoji: '🍽️' },
  { name: 'deep archive', description: '35 nominations in your vault', emoji: '🏛️' },
  { name: 'crowded jar', description: '46 stories you’ve both added', emoji: '🎪' },
  { name: 'legend shelf', description: '60 nominations — serious awards energy', emoji: '🏆' },
]);

/**
 * Couple — completed ceremonies in the vault.
 * First completion still unlocks `opening_night` via ceremony completion rewards.
 */
export const SEASONS_VAULT_COUPLE_TIERS: AwardsTierMeta[] = [
  {
    count: 2,
    id: 'vault_two',
    name: 'second curtain',
    description: 'two ceremonies finished and tucked away',
    emoji: '🎭',
  },
  {
    count: 3,
    id: 'vault_three',
    name: 'triple run',
    description: 'three seasons in the vault',
    emoji: '🔁',
  },
  {
    count: 5,
    id: 'vault_five',
    name: 'five encores',
    description: 'five wrapped ceremonies',
    emoji: '🎪',
  },
  {
    count: 8,
    id: 'vault_eight',
    name: 'octave',
    description: 'eight seasons complete',
    emoji: '🎼',
  },
  {
    count: 12,
    id: 'vault_twelve',
    name: 'dozen bows',
    description: 'twelve ceremonies archived',
    emoji: '🎬',
  },
  {
    count: 17,
    id: 'vault_seventeen',
    name: 'deep catalog',
    description: 'seventeen seasons behind you',
    emoji: '📽️',
  },
  {
    count: 23,
    id: 'vault_twenty_three',
    name: 'long runway',
    description: 'twenty-three vault tuck-ins',
    emoji: '🛫',
  },
  {
    count: 30,
    id: 'vault_thirty',
    name: 'vault hall',
    description: 'thirty ceremonies — hall-of-fame energy',
    emoji: '🏛️',
  },
];

/** Couple — live "vote together" picks completed (same counter as the prior battle ladder) */
const BAT = expandingTotals(2, 12, 7);
export const BATTLE_DECISION_TIERS: AwardsTierMeta[] = zipCounts(BAT, 'battle_badge', [
  { name: 'pick spark', description: '2 live picks finished together', emoji: '✨' },
  { name: 'pick groove', description: '5 live picks in the books', emoji: '🌟' },
  { name: 'pick habit', description: '9 decisions made together', emoji: '⚡' },
  { name: 'pick depth', description: '14 live picks — you do this often', emoji: '🎯' },
  { name: 'pick tested', description: '20 live picks finished', emoji: '🏅' },
  { name: 'pick forged', description: '27 decisions settled', emoji: '🔥' },
  { name: 'pick legends', description: '35 decisions — legendary decide mode', emoji: '👑' },
]);

/** Couple — user-authored nominations that include a photo */
const PHO = expandingTotals(2, 12, 6);
export const AWARDS_PHOTO_COUPLE_TIERS: AwardsTierMeta[] = zipCounts(PHO, 'awards_photo', [
  { name: 'first frames', description: '2 nominations with photos between you', emoji: '📷' },
  { name: 'album starts', description: '5 photo nominations in the jar', emoji: '🖼️' },
  { name: 'wall growing', description: '9 stories with a visual', emoji: '🧱' },
  { name: 'gallery pair', description: '14 photo noms — keep snapping', emoji: '🎞️' },
  { name: 'flash habit', description: '20 nominations with photos', emoji: '✨' },
  { name: 'paparazzi pulse', description: '27 photo memories filed', emoji: '📸' },
]);
