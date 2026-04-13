import { arrayUnion, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Couple, CoupleAwardCategoryRow } from '@/types';
import {
  categoryHasCompleteSeasonHistory,
  mergeCoupleAwardCategoryDefaults,
} from '@/lib/awardCategoryConfig';
import { assertAwardCategoryPauseOrRemoveAllowed } from '@/lib/awardsSeasonCategoryGuards';
import { coupleDoc } from '@/lib/firestore/couples';

function genId(): string {
  return doc(collection(db, 'ceremonies')).id;
}

function readCoupleDoc(coupleId: string, snapData: Record<string, unknown>): Couple {
  return { ...snapData, id: coupleId } as Couple;
}

export async function addAwardCategoryRow(
  coupleId: string,
  input: { label: string; emoji: string },
): Promise<string> {
  const label = input.label.trim();
  const emoji = input.emoji.trim().slice(0, 8);
  if (!label) throw new Error('name can’t be empty');
  if (!emoji) throw new Error('pick an emoji');
  const id = genId();
  const row: CoupleAwardCategoryRow = { id, label, emoji, enabled: true };
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Couple not found');
  const merged = mergeCoupleAwardCategoryDefaults(readCoupleDoc(coupleId, snap.data()!));
  const next = [...(merged.awardCategories ?? []), row];
  await updateDoc(ref, { awardCategories: next });
  return id;
}

export async function updateAwardCategoryRow(
  coupleId: string,
  categoryId: string,
  input: { label: string; emoji: string },
): Promise<void> {
  const label = input.label.trim();
  const emoji = input.emoji.trim().slice(0, 8);
  if (!label) throw new Error('name can’t be empty');
  if (!emoji) throw new Error('pick an emoji');
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Couple not found');
  const merged = mergeCoupleAwardCategoryDefaults(readCoupleDoc(coupleId, snap.data()!));
  const rows = merged.awardCategories ?? [];
  const idx = rows.findIndex((r) => r.id === categoryId);
  if (idx < 0) throw new Error('category not found');
  const next = rows.map((r, i) => (i === idx ? { ...r, label, emoji } : r));
  await updateDoc(ref, { awardCategories: next });
}

export async function disableAwardCategoryRow(coupleId: string, categoryId: string): Promise<void> {
  await assertAwardCategoryPauseOrRemoveAllowed(coupleId);
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Couple not found');
  const data = readCoupleDoc(coupleId, snap.data()!);
  const merged = mergeCoupleAwardCategoryDefaults(data);
  if (categoryHasCompleteSeasonHistory(data, categoryId)) {
    const next = (merged.awardCategories ?? []).map((r) =>
      r.id === categoryId ? { ...r, enabled: false } : r,
    );
    await updateDoc(ref, { awardCategories: next });
    return;
  }
  const next = (merged.awardCategories ?? []).filter((r) => r.id !== categoryId);
  await updateDoc(ref, { awardCategories: next });
}

export async function enableAwardCategoryRow(coupleId: string, categoryId: string): Promise<void> {
  const ref = coupleDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Couple not found');
  const merged = mergeCoupleAwardCategoryDefaults(readCoupleDoc(coupleId, snap.data()!));
  const next = (merged.awardCategories ?? []).map((r) =>
    r.id === categoryId ? { ...r, enabled: true } : r,
  );
  if (!next.some((r) => r.id === categoryId)) throw new Error('category not found');
  await updateDoc(ref, { awardCategories: next });
}

/** Call when a ceremony is marked complete — tracks ids that had nominations that season. */
export async function recordAwardCategoryHistoryForCompletedCeremony(
  coupleId: string,
  categoryIds: string[],
): Promise<void> {
  const uniq = [...new Set(categoryIds)].filter(Boolean);
  if (uniq.length === 0) return;
  await updateDoc(coupleDoc(coupleId), {
    awardCategoryIdsUsedInCompleteSeasons: arrayUnion(...uniq),
  });
}
