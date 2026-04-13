import { create } from 'zustand';
import { subscribeToReasons, addReason as addReasonFs } from '@/lib/firestore/reasons';
import { afterReasonSaved } from '@/lib/gamificationTriggers';
import { Reason } from '@/types';

interface ReasonState {
  reasons: Reason[];

  init: (coupleId: string) => () => void;
  addReason: (params: {
    coupleId: string;
    authorId: string;
    aboutId: string;
    text: string;
  }) => Promise<void>;
}

export const useReasonStore = create<ReasonState>((set) => ({
  reasons: [],

  init: (coupleId: string) => {
    return subscribeToReasons(coupleId, (reasons) => set({ reasons }));
  },

  addReason: async ({ coupleId, authorId, aboutId, text }) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await addReasonFs({
      coupleId,
      authorId,
      aboutId,
      text: trimmed,
      mediaUrl: null,
      mediaType: null,
    });
    await afterReasonSaved(authorId, coupleId);
  },
}));
