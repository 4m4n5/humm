import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ceremony, Couple } from '@/types';

/**
 * Pausing or removing a category changes `enabledAwardCategoryIds` mid-season. While the ceremony is
 * in alignment or resolution, that can drop contested categories from UI and from
 * `allRequiredWinnersPresent`, allowing wrap without agreeing — so we only allow shape changes during
 * `nominating`. (Renaming emoji/label and re-enabling paused categories stay allowed anytime.)
 */
export async function assertAwardCategoryPauseOrRemoveAllowed(coupleId: string): Promise<void> {
  const cSnap = await getDoc(doc(db, 'couples', coupleId));
  if (!cSnap.exists()) return;
  const raw = cSnap.data() as Couple;
  const activeId = raw.activeCeremonyId;
  if (!activeId) return;
  const cerSnap = await getDoc(doc(db, 'ceremonies', activeId));
  if (!cerSnap.exists()) return;
  const ceremony = cerSnap.data() as Ceremony;
  if (ceremony.status === 'nominating') return;
  throw new Error(
    'pause or remove categories only while you’re still in the nominate phase for this season',
  );
}
