import { AWARD_CATEGORIES } from '@/constants/categories';
import type { Couple, CoupleAwardCategoryRow } from '@/types';

export function defaultAwardCategoryRows(): CoupleAwardCategoryRow[] {
  return AWARD_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    emoji: c.emoji,
    enabled: true,
  }));
}

/** Merge legacy couples to default rows; normalize history array. */
export function mergeCoupleAwardCategoryDefaults(couple: Couple): Couple {
  const used = couple.awardCategoryIdsUsedInCompleteSeasons ?? [];
  if (!couple.awardCategories || couple.awardCategories.length === 0) {
    return {
      ...couple,
      awardCategories: defaultAwardCategoryRows(),
      awardCategoryIdsUsedInCompleteSeasons: used,
    };
  }
  return {
    ...couple,
    awardCategoryIdsUsedInCompleteSeasons: used,
  };
}

/** Ids of categories that count for nominating / alignment / completion (excludes paused/disabled). */
export function enabledAwardCategoryIds(rows: CoupleAwardCategoryRow[]): string[] {
  return rows.filter((r) => r.enabled).map((r) => r.id);
}

export function awardCategoryDescription(id: string): string {
  return AWARD_CATEGORIES.find((c) => c.id === id)?.description ?? '';
}

export function findAwardCategoryRow(
  rows: CoupleAwardCategoryRow[] | undefined,
  id: string,
): CoupleAwardCategoryRow | undefined {
  return rows?.find((r) => r.id === id);
}

export function displayForCategoryId(
  rows: CoupleAwardCategoryRow[] | undefined,
  id: string,
): { label: string; emoji: string } {
  const r = findAwardCategoryRow(rows, id);
  if (r) return { label: r.label, emoji: r.emoji };
  const preset = AWARD_CATEGORIES.find((c) => c.id === id);
  if (preset) return { label: preset.label, emoji: preset.emoji };
  return { label: id.replace(/_/g, ' '), emoji: '✨' };
}

/** Enabled categories only, stable order as stored (enabled first in UI sorts separately). */
export function enabledRowsInOrder(rows: CoupleAwardCategoryRow[]): CoupleAwardCategoryRow[] {
  return rows.filter((r) => r.enabled);
}

export function disabledRowsWithHistory(
  rows: CoupleAwardCategoryRow[],
  historyIds: string[],
): CoupleAwardCategoryRow[] {
  const hist = new Set(historyIds);
  return rows.filter((r) => !r.enabled && hist.has(r.id));
}

export function categoryHasCompleteSeasonHistory(couple: Couple, categoryId: string): boolean {
  const merged = mergeCoupleAwardCategoryDefaults(couple);
  return (merged.awardCategoryIdsUsedInCompleteSeasons ?? []).includes(categoryId);
}
