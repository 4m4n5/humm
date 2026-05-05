import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Decision, DecisionCategory, DecisionOption } from '@/types';

// ─── Decision Options (persistent lists per category) ───────────────────────

export const optionsDoc = (coupleId: string) =>
  doc(db, 'decisionOptions', coupleId);

export async function getOptions(
  coupleId: string,
): Promise<Record<DecisionCategory, DecisionOption[]>> {
  const snap = await getDoc(optionsDoc(coupleId));
  if (!snap.exists()) {
    return { food: [], activity: [], movie: [], other: [] };
  }
  return snap.data() as Record<DecisionCategory, DecisionOption[]>;
}

export function subscribeToOptions(
  coupleId: string,
  callback: (opts: Record<DecisionCategory, DecisionOption[]>) => void,
) {
  return onSnapshot(
    optionsDoc(coupleId),
    (snap) => {
      if (!snap.exists()) {
        callback({ food: [], activity: [], movie: [], other: [] });
      } else {
        callback(snap.data() as Record<DecisionCategory, DecisionOption[]>);
      }
    },
    (err) => {
      console.warn('[decisions] subscribeToOptions', err.code, err.message);
      callback({ food: [], activity: [], movie: [], other: [] });
    },
  );
}

export async function saveOptions(
  coupleId: string,
  category: DecisionCategory,
  items: DecisionOption[],
): Promise<void> {
  const ref = optionsDoc(coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { [category]: items });
  } else {
    await updateDoc(ref, { [category]: items });
  }
}

// ─── Decisions (history) ────────────────────────────────────────────────────

export const decisionsCol = () => collection(db, 'decisions');

export async function saveDecision(decision: Omit<Decision, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(decisionsCol());
  await setDoc(ref, { ...decision, id: ref.id, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getRecentDecisions(
  coupleId: string,
  count = 20,
): Promise<Decision[]> {
  const q = query(
    decisionsCol(),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'desc'),
    limit(count),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Decision);
}

export function subscribeToRecentDecisions(
  coupleId: string,
  callback: (decisions: Decision[]) => void,
  count = 20,
) {
  const q = query(
    decisionsCol(),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'desc'),
    limit(count),
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Decision));
    },
    (err) => {
      console.warn('[decisions] subscribeToRecentDecisions', err.code, err.message);
      callback([]);
    },
  );
}

/** Total saved decisions for the couple (Quick Spin + battle). */
export async function getDecisionCountForCouple(coupleId: string): Promise<number> {
  const q = query(decisionsCol(), where('coupleId', '==', coupleId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
