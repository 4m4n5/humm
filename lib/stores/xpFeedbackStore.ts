import { create } from 'zustand';
import type { GrantXpResult } from '@/lib/firestore/gamification';

export type GamificationToast =
  | { kind: 'xp'; result: GrantXpResult }
  | { kind: 'badges'; ids: string[] };

type State = {
  queue: GamificationToast[];
  enqueue: (items: GamificationToast[]) => void;
  shift: () => void;
};

export const useXpFeedbackStore = create<State>((set, get) => ({
  queue: [],
  enqueue: (items) => {
    if (items.length === 0) return;
    set((s) => ({ queue: [...s.queue, ...items] }));
  },
  shift: () => {
    const [, ...rest] = get().queue;
    set({ queue: rest });
  },
}));

export function enqueueGamificationToasts(
  xpResults: (GrantXpResult | null | undefined)[],
  newBadgeIds: string[],
) {
  const items: GamificationToast[] = [];
  for (const r of xpResults) {
    if (r && r.xpGained > 0) items.push({ kind: 'xp', result: r });
  }
  if (newBadgeIds.length > 0) items.push({ kind: 'badges', ids: newBadgeIds });
  useXpFeedbackStore.getState().enqueue(items);
}
