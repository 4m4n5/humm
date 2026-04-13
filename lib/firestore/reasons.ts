import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reason } from '@/types';

export const reasonsCol = () => collection(db, 'reasons');

function createdAtMs(r: Reason): number {
  const t = r.createdAt;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  return 0;
}

export async function addReason(
  data: Omit<Reason, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = doc(reasonsCol());
  await setDoc(ref, {
    ...data,
    id: ref.id,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Single-field query on `coupleId` only (no composite index).
 * Sort newest-first in memory — fine for two people.
 */
export function subscribeToReasons(
  coupleId: string,
  callback: (items: Reason[]) => void,
) {
  const q = query(reasonsCol(), where('coupleId', '==', coupleId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as Reason);
    items.sort((a, b) => createdAtMs(b) - createdAtMs(a));
    callback(items);
  });
}

export function reasonsAboutUser(reasons: Reason[], aboutUserId: string): Reason[] {
  return reasons.filter((r) => r.aboutId === aboutUserId);
}

/** Fisher–Yates shuffle copy */
export function pickRandomReasons(
  aboutReasons: Reason[],
  count: number,
): Reason[] {
  if (aboutReasons.length === 0) return [];
  const copy = [...aboutReasons];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
