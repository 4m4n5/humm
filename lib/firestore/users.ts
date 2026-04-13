import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';

export const usersCol = () => collection(db, 'users');
export const userDoc = (uid: string) => doc(db, 'users', uid);

export async function createUserProfile(
  uid: string,
  displayName: string,
  inviteCode: string,
): Promise<void> {
  await setDoc(userDoc(uid), {
    uid,
    displayName,
    avatarUrl: null,
    partnerId: null,
    coupleId: null,
    fcmToken: null,
    inviteCode,
    xp: 0,
    level: 1,
    badges: [],
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
) {
  return onSnapshot(
    userDoc(uid),
    (snap) => {
      callback(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      console.warn('[users] profile snapshot', uid, error);
      callback(null);
    },
  );
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  await updateDoc(userDoc(uid), updates as Record<string, unknown>);
}

/**
 * After a successful “deal three” on the Reasons tab — record how many
 * “by you for partner” reasons existed at that moment (no stacking of draws).
 */
export async function setReasonPartnerCountAtLastDraw(
  uid: string,
  partnerReasonCount: number,
): Promise<void> {
  const n = Math.max(0, Math.floor(partnerReasonCount));
  await updateDoc(userDoc(uid), {
    reasonPartnerCountAtLastDraw: n,
  });
}

export async function findUserByInviteCode(
  code: string,
): Promise<UserProfile | null> {
  const q = query(usersCol(), where('inviteCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function linkPartners(
  myUid: string,
  partnerUid: string,
  coupleId: string,
): Promise<void> {
  await Promise.all([
    updateDoc(userDoc(myUid), { partnerId: partnerUid, coupleId }),
    updateDoc(userDoc(partnerUid), { partnerId: myUid, coupleId }),
  ]);
}
