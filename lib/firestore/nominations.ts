import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Nomination } from '@/types';

export const nominationsCol = () => collection(db, 'nominations');

function createdAtMs(n: Nomination): number {
  const t = n.createdAt;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  return 0;
}

export async function addNomination(
  data: Omit<Nomination, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = doc(nominationsCol());
  await setDoc(ref, {
    ...data,
    id: ref.id,
    seeded: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateNomination(
  id: string,
  updates: { title: string; description: string; nomineeId: string | 'both' },
): Promise<void> {
  const ref = doc(nominationsCol(), id);
  await updateDoc(ref, {
    title: updates.title.trim(),
    description: updates.description.trim(),
    nomineeId: updates.nomineeId,
  });
}

/**
 * `coupleId` + `ceremonyId` equality (composite index). Sort newest-first in memory.
 */
export function subscribeToNominations(
  coupleId: string,
  ceremonyId: string,
  callback: (items: Nomination[]) => void,
) {
  const q = query(
    nominationsCol(),
    where('coupleId', '==', coupleId),
    where('ceremonyId', '==', ceremonyId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as Nomination);
      items.sort((a, b) => createdAtMs(b) - createdAtMs(a));
      callback(items);
    },
    (err) => {
      console.warn('[nominations] subscribeToNominations', err.code, err.message);
      callback([]);
    },
  );
}

/**
 * All nominations for a couple across every season. Single-field `coupleId` query; sort newest-first in memory.
 */
export function subscribeToNominationsForCouple(
  coupleId: string,
  callback: (items: Nomination[]) => void,
) {
  const q = query(nominationsCol(), where('coupleId', '==', coupleId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => d.data() as Nomination);
      items.sort((a, b) => createdAtMs(b) - createdAtMs(a));
      callback(items);
    },
    (err) => {
      console.warn('[nominations] subscribeToNominationsForCouple', err.code, err.message);
      callback([]);
    },
  );
}

export function nominationsForCategory(
  nominations: Nomination[],
  category: Nomination['category'],
): Nomination[] {
  return nominations.filter((n) => n.category === category);
}

export async function fetchNominationsForCeremony(
  coupleId: string,
  ceremonyId: string,
): Promise<Nomination[]> {
  const q = query(
    nominationsCol(),
    where('coupleId', '==', coupleId),
    where('ceremonyId', '==', ceremonyId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Nomination);
}
