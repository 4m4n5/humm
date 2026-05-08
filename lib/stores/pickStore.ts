import { create } from 'zustand';
import { subscribeToCouple } from '@/lib/firestore/couples';
import { subscribeToPick } from '@/lib/firestore/picks';
import { PickSession, Couple } from '@/types';

interface PickState {
  pick: PickSession | null;
  couple: Couple | null;

  init: (coupleId: string) => () => void;
}

export const usePickStore = create<PickState>((set) => ({
  pick: null,
  couple: null,

  init: (coupleId: string) => {
    let unsubPick: (() => void) | null = null;

    const cleanupPick = () => {
      unsubPick?.();
      unsubPick = null;
    };

    const unsubCouple = subscribeToCouple(coupleId, (couple) => {
      cleanupPick();
      if (!couple) {
        set({ pick: null, couple: null });
        return;
      }
      set({ couple });
      const bid = couple.activeBattleId ?? null;
      if (!bid) {
        set({ pick: null });
        return;
      }
      unsubPick = subscribeToPick(bid, (pick) => {
        set({ pick });
      });
    });

    return () => {
      unsubCouple();
      cleanupPick();
    };
  },
}));
