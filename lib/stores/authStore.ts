import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { deleteMyAccountFirestoreData } from '@/lib/firestore/accountDeletion';
import {
  createUserProfile,
  getUserProfile,
  findUserByInviteCode,
  linkPartners,
  subscribeToUserProfile,
} from '@/lib/firestore/users';
import { createCouple } from '@/lib/firestore/couples';
import { UserProfile } from '@/types';

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  linkPartner: (code: string) => Promise<void>;
  clearError: () => void;
}

let profileUnsub: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  profile: null,
  isLoading: true,
  error: null,

  init: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        if (user) {
          set({ firebaseUser: user });
          // Subscribe to real-time profile updates
          if (profileUnsub) profileUnsub();
          profileUnsub = subscribeToUserProfile(user.uid, (profile) => {
            set({ profile, isLoading: false });
          });
        } else {
          if (profileUnsub) {
            profileUnsub();
            profileUnsub = null;
          }
          set({ firebaseUser: null, profile: null, isLoading: false });
        }
      } catch (e) {
        console.warn('[auth] onAuthStateChanged handler', e);
        set({ isLoading: false });
      }
    });
    return unsub;
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      set({ error: friendlyAuthError(e.code), isLoading: false });
      throw e;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const inviteCode = generateInviteCode();
      await createUserProfile(user.uid, displayName, inviteCode);
    } catch (e: any) {
      set({ error: friendlyAuthError(e.code), isLoading: false });
      throw e;
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
  },

  deleteAccount: async (password: string) => {
    set({ isLoading: true, error: null });
    const u = get().firebaseUser;
    if (!u) {
      set({ error: 'not signed in', isLoading: false });
      throw new Error('not signed in');
    }
    const email = u.email;
    if (!email) {
      set({ error: 'this account has no email on file — contact support', isLoading: false });
      throw new Error('no email');
    }
    try {
      const cred = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(u, cred);
      await deleteMyAccountFirestoreData(u.uid);
      await deleteUser(u);
      set({ isLoading: false });
    } catch (e: unknown) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        set({ error: 'wrong password — try again', isLoading: false });
      } else if (code === 'auth/network-request-failed') {
        set({ error: 'network hiccup — check connection', isLoading: false });
      } else if (code === 'auth/too-many-requests') {
        set({ error: 'too many tries — wait a bit, then retry', isLoading: false });
      } else if (code === 'auth/requires-recent-login') {
        set({ error: 'sign in again, then retry delete', isLoading: false });
      } else if (code === 'permission-denied') {
        set({
          error: 'couldn’t complete delete (server rules) — try again or contact support',
          isLoading: false,
        });
      } else {
        set({ error: 'couldn’t delete account — try again', isLoading: false });
      }
      throw e;
    }
  },

  linkPartner: async (code: string) => {
    set({ error: null });
    const { firebaseUser, profile } = get();
    if (!firebaseUser || !profile) {
      set({ error: 'not signed in' });
      return;
    }
    if (code.toUpperCase() === profile.inviteCode) {
      set({ error: 'that’s your own code — send it to your partner, not yourself' });
      return;
    }
    const partner = await findUserByInviteCode(code);
    if (!partner) {
      set({ error: 'code not found — check with them and try again' });
      return;
    }
    if (partner.coupleId) {
      set({ error: 'they’re already linked with someone else' });
      return;
    }
    const coupleId = await createCouple(firebaseUser.uid, partner.uid);
    await linkPartners(firebaseUser.uid, partner.uid, coupleId);
  },

  clearError: () => set({ error: null }),
}));

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'that email doesn’t look right — typo?';
    case 'auth/user-not-found':
      return 'no account on that email — sign up or try another';
    case 'auth/wrong-password':
      return 'wrong password — try again or reset with your provider';
    case 'auth/email-already-in-use':
      return 'that email’s taken — want to sign in instead?';
    case 'auth/weak-password':
      return 'needs a stronger password (6+ characters)';
    case 'auth/too-many-requests':
      return 'too many tries — breathe, then retry';
    case 'auth/invalid-credential':
      return 'email or password didn’t match — double-check both';
    case 'auth/network-request-failed':
      return 'network hiccup — check connection';
    case 'auth/user-disabled':
      return 'this account can’t sign in right now';
    case 'auth/operation-not-allowed':
      return 'this sign-in method isn’t on for the app';
    default:
      return 'something went sideways — try again';
  }
}
