import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Couple } from '@/types';
import { createCeremony } from '@/lib/firestore/ceremonies';
import { mergeCoupleGamificationDefaults } from '@/lib/coupleGamificationDefaults';
import {
  defaultAwardCategoryRows,
  mergeCoupleAwardCategoryDefaults,
} from '@/lib/awardCategoryConfig';

export const couplesCol = () => collection(db, 'couples');
export const coupleDoc = (id: string) => doc(db, 'couples', id);

export async function createCouple(
  user1Id: string,
  user2Id: string,
): Promise<string> {
  const id = `${user1Id}_${user2Id}`;
  await setDoc(coupleDoc(id), {
    id,
    user1Id,
    user2Id,
    createdAt: serverTimestamp(),
    activeCeremonyId: null,
    activeBattleId: null,
    awardCategories: defaultAwardCategoryRows(),
    awardCategoryIdsUsedInCompleteSeasons: [],
  });
  const ceremonyId = await createCeremony(id);
  await updateDoc(coupleDoc(id), { activeCeremonyId: ceremonyId });
  return id;
}

function coupleFromSnapshot(id: string, data: Record<string, unknown>): Couple {
  return { ...data, id } as Couple;
}

export async function getCouple(id: string): Promise<Couple | null> {
  const snap = await getDoc(coupleDoc(id));
  if (!snap.exists()) return null;
  const withG = mergeCoupleGamificationDefaults(coupleFromSnapshot(id, snap.data()!));
  if (!withG) return null;
  return mergeCoupleAwardCategoryDefaults(withG);
}

export function subscribeToCouple(
  id: string,
  callback: (couple: Couple | null) => void,
) {
  return onSnapshot(coupleDoc(id), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const withG = mergeCoupleGamificationDefaults(coupleFromSnapshot(id, snap.data()!));
    callback(withG ? mergeCoupleAwardCategoryDefaults(withG) : null);
  });
}
