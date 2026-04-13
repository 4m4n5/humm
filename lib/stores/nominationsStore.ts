import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { subscribeToCouple } from '@/lib/firestore/couples';
import {
  subscribeToNominations,
  addNomination as addNominationFs,
  updateNomination as updateNominationFs,
} from '@/lib/firestore/nominations';
import { subscribeToCeremony, ensureActiveCeremonyForCouple } from '@/lib/firestore/ceremonies';
import { subscribeToUserProfile } from '@/lib/firestore/users';
import { AwardCategory, Ceremony, Couple, Nomination, UserProfile } from '@/types';
import { afterNominationSaved } from '@/lib/gamificationTriggers';

interface NominationsState {
  nominations: Nomination[];
  ceremony: Ceremony | null;
  couple: Couple | null;
  partnerProfile: UserProfile | null;

  init: (coupleId: string, myUid: string) => () => void;
  addNomination: (params: {
    coupleId: string;
    ceremonyId: string;
    category: AwardCategory;
    nomineeId: string | 'both';
    submittedBy: string;
    title: string;
    description: string;
  }) => Promise<void>;
  updateNomination: (params: {
    id: string;
    title: string;
    description: string;
    nomineeId: string | 'both';
  }) => Promise<void>;
}

export const useNominationsStore = create<NominationsState>((set, get) => ({
  nominations: [],
  ceremony: null,
  couple: null,
  partnerProfile: null,

  init: (coupleId: string, myUid: string) => {
    let unsubNoms: (() => void) | null = null;
    let unsubCeremony: (() => void) | null = null;
    let unsubPartner: (() => void) | null = null;

    const cleanupSubs = () => {
      unsubNoms?.();
      unsubNoms = null;
      unsubCeremony?.();
      unsubCeremony = null;
      unsubPartner?.();
      unsubPartner = null;
    };

    const unsubCouple = subscribeToCouple(coupleId, (couple) => {
      cleanupSubs();
      if (!couple) {
        set({ nominations: [], ceremony: null, couple: null, partnerProfile: null });
        return;
      }
      if (!couple.activeCeremonyId) {
        set({ nominations: [], ceremony: null, couple });
        ensureActiveCeremonyForCouple(coupleId).catch(console.error);
        return;
      }
      void ensureActiveCeremonyForCouple(coupleId).catch(console.error);
      set({ couple });

      const partnerUid = couple.user1Id === myUid ? couple.user2Id : couple.user1Id;
      unsubPartner = subscribeToUserProfile(partnerUid, (p) => set({ partnerProfile: p }));

      const ceremonyId = couple.activeCeremonyId;
      unsubCeremony = subscribeToCeremony(ceremonyId, (ceremony) => {
        set({ ceremony });
      });
      unsubNoms = subscribeToNominations(coupleId, ceremonyId, (nominations) => {
        set({ nominations });
      });
    });

    return () => {
      unsubCouple();
      cleanupSubs();
    };
  },

  addNomination: async (params) => {
    const title = params.title.trim();
    const description = params.description.trim();
    const id = await addNominationFs({
      coupleId: params.coupleId,
      ceremonyId: params.ceremonyId,
      category: params.category,
      nomineeId: params.nomineeId,
      submittedBy: params.submittedBy,
      title,
      description,
      photoUrl: null,
      eventDate: null,
    });
    const ceremony = get().ceremony;
    if (ceremony) {
      const synthetic: Nomination = {
        id,
        coupleId: params.coupleId,
        ceremonyId: params.ceremonyId,
        category: params.category,
        nomineeId: params.nomineeId,
        submittedBy: params.submittedBy,
        title,
        description,
        photoUrl: null,
        eventDate: null,
        createdAt: Timestamp.now(),
        seeded: false,
      };
      await afterNominationSaved(
        params.submittedBy,
        params.coupleId,
        ceremony,
        params.category,
        [...get().nominations, synthetic],
      );
    }
  },

  updateNomination: async (params: {
    id: string;
    title: string;
    description: string;
    nomineeId: string | 'both';
  }) => {
    await updateNominationFs(params.id, {
      title: params.title,
      description: params.description,
      nomineeId: params.nomineeId,
    });
  },
}));
