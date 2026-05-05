import { create } from 'zustand';
import { Timestamp } from 'firebase/firestore';
import { DecisionCategory, DecisionOption, Decision } from '@/types';
import { DECISION_CATEGORIES } from '@/constants/categories';
import {
  getOptions,
  saveOptions,
  saveDecision,
  getRecentDecisions,
  subscribeToOptions,
  subscribeToRecentDecisions,
} from '@/lib/firestore/decisions';

function makeId() {
  return Math.random().toString(36).substring(2, 10);
}

interface DecisionState {
  options: Record<DecisionCategory, DecisionOption[]>;
  history: Decision[];
  isLoading: boolean;

  // Lifecycle
  init: (coupleId: string) => () => void;

  // Options management
  addOption: (coupleId: string, category: DecisionCategory, label: string) => Promise<void>;
  removeOption: (coupleId: string, category: DecisionCategory, optionId: string) => Promise<void>;
  markOptionPicked: (coupleId: string, category: DecisionCategory, optionId: string) => Promise<void>;

  // Decisions
  recordDecision: (decision: Omit<Decision, 'id' | 'createdAt'>) => Promise<string>;
}

export const useDecisionStore = create<DecisionState>((set, get) => ({
  options: { food: [], activity: [], movie: [], other: [] },
  history: [],
  isLoading: false,

  init: (coupleId: string) => {
    // Subscribe to options and history in real time
    const unsubOpts = subscribeToOptions(coupleId, (opts) => {
      set({ options: opts });
    });
    const unsubHistory = subscribeToRecentDecisions(coupleId, (history) => {
      set({ history });
    });

    void seedDefaultOptions(coupleId, get).catch((e) =>
      console.warn('[decisions] seedDefaultOptions', e),
    );

    return () => {
      unsubOpts();
      unsubHistory();
    };
  },

  addOption: async (coupleId, category, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const current = get().options[category];
    const isDuplicate = current.some(
      (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) return;
    const newOption: DecisionOption = {
      id: makeId(),
      label: trimmed,
      tags: [],
      lastPickedAt: null,
    };
    const updated = [...current, newOption];
    set((s) => ({ options: { ...s.options, [category]: updated } }));
    await saveOptions(coupleId, category, updated);
  },

  removeOption: async (coupleId, category, optionId) => {
    const updated = get().options[category].filter((o) => o.id !== optionId);
    set((s) => ({ options: { ...s.options, [category]: updated } }));
    await saveOptions(coupleId, category, updated);
  },

  markOptionPicked: async (coupleId, category, optionId) => {
    const updated = get().options[category].map((o) =>
      o.id === optionId ? { ...o, lastPickedAt: Timestamp.now() } : o,
    );
    set((s) => ({ options: { ...s.options, [category]: updated } }));
    await saveOptions(coupleId, category, updated);
  },

  recordDecision: async (decision) => {
    return saveDecision(decision);
  },
}));

async function seedDefaultOptions(
  coupleId: string,
  get: () => DecisionState,
) {
  const current = await getOptions(coupleId);
  for (const cat of DECISION_CATEGORIES) {
    const existing = current[cat.id] ?? [];
    if (existing.length === 0 && cat.defaultOptions.length > 0) {
      const items: DecisionOption[] = cat.defaultOptions.map((label) => ({
        id: makeId(),
        label,
        tags: [],
        lastPickedAt: null,
      }));
      await saveOptions(coupleId, cat.id, items);
    }
  }
}
