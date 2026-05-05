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
import { UserProfile, Couple } from '@/types';

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
  // Partner doc first — writing our own doc triggers the profile listener
  // which navigates away from the link screen. If the partner write fails
  // we must stay on the link screen so the error is visible.
  await updateDoc(userDoc(partnerUid), { partnerId: myUid, coupleId });
  await updateDoc(userDoc(myUid), { partnerId: partnerUid, coupleId });
}

/**
 * Detect and repair half-linked state: a couple doc exists that contains
 * this uid but the user profile has no coupleId. Returns the repaired
 * coupleId if fixed, or null if nothing needed fixing.
 */
export async function repairHalfLinkedProfile(uid: string): Promise<string | null> {
  const couplesRef = collection(db, 'couples');

  const [asUser1, asUser2] = await Promise.all([
    getDocs(query(couplesRef, where('user1Id', '==', uid))),
    getDocs(query(couplesRef, where('user2Id', '==', uid))),
  ]);

  const coupleSnap = asUser1.docs[0] ?? asUser2.docs[0];
  if (!coupleSnap) return null;

  const couple = coupleSnap.data() as Couple;
  const partnerId = couple.user1Id === uid ? couple.user2Id : couple.user1Id;

  await updateDoc(userDoc(uid), { partnerId, coupleId: couple.id });
  return couple.id;
}
