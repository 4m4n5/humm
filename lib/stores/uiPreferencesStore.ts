import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type State = {
  /** Success-style buzz when quick spin lands on a result */
  spinResultHaptics: boolean;
  setSpinResultHaptics: (value: boolean) => void;
  /** Local OS reminders before award season window ends (see ceremony calendar) */
  ceremonyLocalRemindersEnabled: boolean;
  /** Which `ceremony.id` the scheduled notifications belong to (resync when season changes) */
  ceremonyReminderScheduledForId: string | null;
  setCeremonyLocalRemindersEnabled: (value: boolean) => void;
  setCeremonyReminderScheduledForId: (id: string | null) => void;
};

export const useUiPreferencesStore = create<State>()(
  persist(
    (set) => ({
      spinResultHaptics: true,
      setSpinResultHaptics: (spinResultHaptics) => set({ spinResultHaptics }),
      ceremonyLocalRemindersEnabled: false,
      ceremonyReminderScheduledForId: null,
      setCeremonyLocalRemindersEnabled: (ceremonyLocalRemindersEnabled) =>
        set({ ceremonyLocalRemindersEnabled }),
      setCeremonyReminderScheduledForId: (ceremonyReminderScheduledForId) =>
        set({ ceremonyReminderScheduledForId }),
    }),
    {
      name: 'humtum-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
