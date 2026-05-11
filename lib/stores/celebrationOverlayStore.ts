import { create } from 'zustand';

/**
 * Tracks whether any peak-moment celebration overlay (emoji shower, etc.)
 * is currently on screen. While `active > 0`, secondary feedback surfaces
 * — XP banner, level-up modal, new-badge modal — should hold their queue
 * so the user gets one composed beat at a time. The counter form lets
 * multiple concurrent showers stack safely.
 */
type State = {
  active: number;
  push: () => void;
  pop: () => void;
};

export const useCelebrationOverlayStore = create<State>((set) => ({
  active: 0,
  push: () => set((s) => ({ active: s.active + 1 })),
  pop: () => set((s) => ({ active: Math.max(0, s.active - 1) })),
}));
