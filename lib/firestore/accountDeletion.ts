import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc,
  limit,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserProfile, userDoc } from '@/lib/firestore/users';
import { coupleDoc } from '@/lib/firestore/couples';
import { optionsDoc } from '@/lib/firestore/decisions';

/**
 * Couple-scoped collections wiped on account deletion. Keep this in sync with
 * `scripts/create-demo-accounts.mjs` → `wipeCoupleAndUsers` and with Firestore
 * rules that gate `allow delete` for each collection. Apple App Review (5.1.1(v))
 * requires that user data created during couple flows is removed on deletion.
 */
const COUPLE_SCOPED_COLLECTIONS = [
  'nominations',
  'ceremonies',
  'decisions',
  'reasons',
  'battles',
  'moodEntries',
  'habits',
  'habitCheckins',
] as const;

async function deleteDocumentsForCouple(collectionName: string, coupleId: string): Promise<void> {
  const colRef = collection(db, collectionName);
  const qRef = query(colRef, where('coupleId', '==', coupleId), limit(500));
  for (;;) {
    const snap = await getDocs(qRef);
    if (snap.empty) break;
    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
    if (snap.size < 500) break;
  }
}

/**
 * Removes this user’s Firestore data and shared couple data (Option A: client deletes).
 * Call only after `reauthenticateWithCredential`; finish with `deleteUser` on the Auth user.
 */
export async function deleteMyAccountFirestoreData(uid: string): Promise<void> {
  const profile = await getUserProfile(uid);

  if (profile?.partnerId) {
    const partnerRef = userDoc(profile.partnerId);
    const partnerSnap = await getDoc(partnerRef);
    const pData = partnerSnap.data();
    if (pData && pData.partnerId === uid) {
      await updateDoc(partnerRef, {
        partnerId: null,
        coupleId: null,
      });
    }
  }

  const coupleId = profile?.coupleId ?? null;
  if (coupleId) {
    for (const name of COUPLE_SCOPED_COLLECTIONS) {
      await deleteDocumentsForCouple(name, coupleId);
    }
    const optRef = optionsDoc(coupleId);
    const optSnap = await getDoc(optRef);
    if (optSnap.exists()) {
      await deleteDoc(optRef);
    }
    const cRef = coupleDoc(coupleId);
    const cSnap = await getDoc(cRef);
    if (cSnap.exists()) {
      await deleteDoc(cRef);
    }
  }

  const mine = userDoc(uid);
  const mineSnap = await getDoc(mine);
  if (mineSnap.exists()) {
    await deleteDoc(mine);
  }
}
