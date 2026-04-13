import { create } from 'zustand';
import { subscribeToCouple } from '@/lib/firestore/couples';
import { subscribeToBattle } from '@/lib/firestore/battles';
import { BattleSession, Couple } from '@/types';

interface BattleState {
  battle: BattleSession | null;
  couple: Couple | null;

  init: (coupleId: string) => () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  battle: null,
  couple: null,

  init: (coupleId: string) => {
    let unsubBattle: (() => void) | null = null;

    const cleanupBattle = () => {
      unsubBattle?.();
      unsubBattle = null;
    };

    const unsubCouple = subscribeToCouple(coupleId, (couple) => {
      cleanupBattle();
      if (!couple) {
        set({ battle: null, couple: null });
        return;
      }
      set({ couple });
      const bid = couple.activeBattleId ?? null;
      if (!bid) {
        set({ battle: null });
        return;
      }
      unsubBattle = subscribeToBattle(bid, (battle) => {
        set({ battle });
      });
    });

    return () => {
      unsubCouple();
      cleanupBattle();
    };
  },
}));
