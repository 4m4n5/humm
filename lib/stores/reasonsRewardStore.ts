import { create } from 'zustand';

/**
 * After saving a reason on the write screen, the Reasons tab consumes this on focus
 * to run the celebration + auto “three about you” draw.
 */
interface ReasonsRewardState {
  pendingRewardAfterWrite: boolean;
  armPendingReward: () => void;
  /** Returns true once (clears the flag). */
  consumePendingReward: () => boolean;
}

export const useReasonsRewardStore = create<ReasonsRewardState>((set, get) => ({
  pendingRewardAfterWrite: false,
  armPendingReward: () => set({ pendingRewardAfterWrite: true }),
  consumePendingReward: () => {
    if (!get().pendingRewardAfterWrite) return false;
    set({ pendingRewardAfterWrite: false });
    return true;
  },
}));
