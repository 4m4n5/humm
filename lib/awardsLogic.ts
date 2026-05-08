import {
  AwardCategory,
  Ceremony,
  CeremonyWinner,
  Nomination,
} from '@/types';

/** Enabled categories that have at least one nomination this ceremony (order follows `enabledCategoryIds`). */
export function categoriesWithNominations(
  nominations: Nomination[],
  enabledCategoryIds: string[],
): AwardCategory[] {
  const enabled = new Set(enabledCategoryIds);
  const has = new Set<AwardCategory>();
  for (const n of nominations) {
    if (enabled.has(n.category)) has.add(n.category);
  }
  return enabledCategoryIds.filter((id) => has.has(id));
}

/**
 * True when every **enabled** category id has ≥1 nomination for this ceremony.
 * Disabled/paused category ids are not in `enabledCategoryIds`, so they never block alignment start.
 */
export function allEnabledCategoriesHaveNominations(
  nominations: Nomination[],
  enabledCategoryIds: string[],
): boolean {
  if (enabledCategoryIds.length === 0) return false;
  const has = new Set<string>();
  for (const n of nominations) has.add(n.category);
  return enabledCategoryIds.every((id) => has.has(id));
}

export function bothPartnersSubmittedPicks(
  ceremony: Ceremony | null,
  uidA: string,
  uidB: string,
): boolean {
  if (!ceremony?.picksSubmitted) return false;
  return !!ceremony.picksSubmitted[uidA] && !!ceremony.picksSubmitted[uidB];
}

export function computeAgreedWinners(
  ceremony: Ceremony,
  nominations: Nomination[],
  uidA: string,
  uidB: string,
  enabledCategoryIds: string[],
): Partial<Record<AwardCategory, CeremonyWinner>> {
  const out: Partial<Record<AwardCategory, CeremonyWinner>> = {};
  const pickA = ceremony.picksByUser?.[uidA] ?? {};
  const pickB = ceremony.picksByUser?.[uidB] ?? {};

  for (const cat of enabledCategoryIds) {
    const inCat = nominations.filter((n) => n.category === cat);
    if (inCat.length === 0) continue;
    const a = pickA[cat];
    const b = pickB[cat];
    if (a && b && a === b) {
      const nom = inCat.find((n) => n.id === a);
      if (nom) {
        out[cat] = {
          nominationId: a,
          agreedBy: [uidA, uidB],
          nomineeId: nom.nomineeId,
        };
      }
    }
  }
  return out;
}

export function deliberationDisagreementCount(
  ceremony: Ceremony,
  nominations: Nomination[],
  uidA: string,
  uidB: string,
  enabledCategoryIds: string[],
): number {
  const pickA = ceremony.picksByUser?.[uidA] ?? {};
  const pickB = ceremony.picksByUser?.[uidB] ?? {};
  let n = 0;
  for (const cat of enabledCategoryIds) {
    const inCat = nominations.filter((x) => x.category === cat);
    if (inCat.length === 0) continue;
    const a = pickA[cat];
    const b = pickB[cat];
    if (a && b && a !== b) n += 1;
  }
  return n;
}

export function contestedCategories(
  ceremony: Ceremony,
  nominations: Nomination[],
  uidA: string,
  uidB: string,
  enabledCategoryIds: string[],
): AwardCategory[] {
  const winners = ceremony.winners ?? {};
  const pickA = ceremony.picksByUser?.[uidA] ?? {};
  const pickB = ceremony.picksByUser?.[uidB] ?? {};
  const out: AwardCategory[] = [];

  for (const cat of enabledCategoryIds) {
    if (winners[cat]) continue;
    const inCat = nominations.filter((n) => n.category === cat);
    if (inCat.length === 0) continue;
    const a = pickA[cat];
    const b = pickB[cat];
    if (a && b && a !== b) out.push(cat);
  }
  return out;
}

export function agreedCategoryList(
  ceremony: Ceremony,
  nominations: Nomination[],
  uidA: string,
  uidB: string,
  enabledCategoryIds: string[],
): AwardCategory[] {
  return Object.keys(
    computeAgreedWinners(ceremony, nominations, uidA, uidB, enabledCategoryIds),
  ) as AwardCategory[];
}

export function allRequiredWinnersPresent(
  nominations: Nomination[],
  winners: Partial<Record<AwardCategory, CeremonyWinner>>,
  enabledCategoryIds: string[],
): boolean {
  if (enabledCategoryIds.length === 0) return false;
  for (const cat of categoriesWithNominations(nominations, enabledCategoryIds)) {
    if (!winners[cat]) return false;
  }
  return true;
}

export function periodEndMs(c: Ceremony): number {
  const t = c.periodEnd;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  return 0;
}

function labelForPickError(cat: string, labels?: Record<string, string>): string {
  const L = labels?.[cat];
  return L && L.trim() ? L : cat;
}

/** Every enabled category with nominations must have a valid pick. */
export function validateDeliberationPicks(
  picks: Partial<Record<AwardCategory, string>>,
  nominations: Nomination[],
  enabledCategoryIds: string[],
  categoryLabels?: Record<string, string>,
): string | null {
  const required = categoriesWithNominations(nominations, enabledCategoryIds);
  for (const cat of required) {
    const id = picks[cat];
    if (!id) return `pick something for ${labelForPickError(cat, categoryLabels)}`;
    const ok = nominations.some((n) => n.id === id && n.category === cat);
    if (!ok) return 'invalid pick · try again';
  }
  return null;
}

export function nominationById(
  nominations: Nomination[],
  id: string,
): Nomination | undefined {
  return nominations.find((n) => n.id === id);
}
