import { BADGES, type BadgeDefinition } from '@/constants/badges';

const DEFAULT_TEASER_COUNT = 5;

export function earnableBadgeCatalog(): BadgeDefinition[] {
  return BADGES;
}

/** Unearned badges only, shuffled; slice to `count` for a small teaser list. */
export function pickRandomTeasers(earnedIds: string[], count = DEFAULT_TEASER_COUNT): BadgeDefinition[] {
  const earned = new Set(earnedIds);
  const pool = earnableBadgeCatalog().filter((b) => !earned.has(b.id));
  if (pool.length === 0) return [];

  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export const BADGE_TEASER_COUNT = DEFAULT_TEASER_COUNT;
