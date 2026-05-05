import { create } from 'zustand';
import {
  subscribeToHabits,
  subscribeToCheckinsInDayKeyRange,
  subscribeToCheckinsForDay,
  subscribeToCheckinsForWeek,
  createHabit as createHabitFs,
  archiveHabit as archiveHabitFs,
  updateHabit as updateHabitFs,
  toggleDailyCheckin as toggleDailyCheckinFs,
  toggleWeeklyCheckin as toggleWeeklyCheckinFs,
  type CreateHabitInput,
} from '@/lib/firestore/habits';
import { subscribeToCouple } from '@/lib/firestore/couples';
import { localDayKey, localWeekKey, offsetLocalDayKey } from '@/lib/dateKeys';
import { afterHabitCheckin, afterHabitCreated } from '@/lib/gamificationTriggers';
import type { Couple, Habit, HabitCheckin } from '@/types';

export type HabitsView = 'daily' | 'weekly';

interface HabitState {
  habits: Habit[];
  todayDailyCheckins: HabitCheckin[];
  weekWeeklyCheckins: HabitCheckin[];
  rangeDailyCheckins: HabitCheckin[];
  couple: Couple | null;
  todayKey: string;
  weekKey: string;
  view: HabitsView;
  setView: (v: HabitsView) => void;

  init: (coupleId: string) => () => void;
  toggleDailyCheckin: (habitId: string, coupleId: string, uid: string) => Promise<void>;
  toggleWeeklyCheckin: (habitId: string, coupleId: string, uid: string) => Promise<void>;
  createHabit: (input: CreateHabitInput) => Promise<void>;
  updateHabit: (habitId: string, patch: Partial<Pick<Habit, 'title' | 'emoji' | 'cadence' | 'scope' | 'weeklyStartWeekKey'>>) => Promise<void>;
  archiveHabit: (habitId: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayDailyCheckins: [],
  weekWeeklyCheckins: [],
  rangeDailyCheckins: [],
  couple: null,
  todayKey: localDayKey(),
  weekKey: localWeekKey(),
  view: 'daily',

  setView: (v) => set({ view: v }),

  init: (coupleId: string) => {
    const dayKey = localDayKey();
    const wk = localWeekKey();
    const minKey = offsetLocalDayKey(dayKey, -400);
    set({ todayKey: dayKey, weekKey: wk });
    const u1 = subscribeToHabits(coupleId, (habits) => set({ habits }));
    const u2 = subscribeToCheckinsForDay(coupleId, dayKey, (todayDailyCheckins) => set({ todayDailyCheckins }));
    const u3 = subscribeToCheckinsForWeek(coupleId, wk, (weekWeeklyCheckins) => set({ weekWeeklyCheckins }));
    const u4 = subscribeToCheckinsInDayKeyRange(coupleId, minKey, dayKey, (rangeDailyCheckins) =>
      set({ rangeDailyCheckins }),
    );
    const u5 = subscribeToCouple(coupleId, (couple) => set({ couple }));
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  },

  toggleDailyCheckin: async (habitId: string, coupleId: string, uid: string) => {
    try {
      const habit = get().habits.find((h) => h.id === habitId);
      if (!habit || habit.cadence !== 'daily') return;
      const dayKey = localDayKey();
      const result = await toggleDailyCheckinFs(habitId, coupleId, uid, dayKey);
      await afterHabitCheckin(uid, coupleId, habit, result, { kind: 'daily', dayKey });
    } catch (e) {
      console.warn('[habits] toggleDailyCheckin', e);
    }
  },

  toggleWeeklyCheckin: async (habitId: string, coupleId: string, uid: string) => {
    try {
      const habit = get().habits.find((h) => h.id === habitId);
      if (!habit || habit.cadence !== 'weekly') return;
      const weekKey = localWeekKey();
      const result = await toggleWeeklyCheckinFs(habitId, coupleId, uid, weekKey);
      await afterHabitCheckin(uid, coupleId, habit, result, { kind: 'weekly', weekKey });
    } catch (e) {
      console.warn('[habits] toggleWeeklyCheckin', e);
    }
  },

  createHabit: async (input) => {
    try {
      await createHabitFs(input);
      await afterHabitCreated(input.createdBy, input.coupleId);
    } catch (e) {
      console.warn('[habits] createHabit', e);
    }
  },

  updateHabit: async (habitId, patch) => {
    await updateHabitFs(habitId, patch);
  },

  archiveHabit: async (habitId: string) => {
    await archiveHabitFs(habitId);
  },
}));
