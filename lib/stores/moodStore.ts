import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
import type { MoodEntry } from '@/types';
import {
  subscribeToMoodEntry,
  subscribeToCoupleMoodFeed,
  paginateCoupleMood,
} from '@/lib/firestore/moodEntries';
import { localDayKey } from '@/lib/dateKeys';

const FEED_PAGE_SIZE = 60;

interface MoodState {
  myToday: MoodEntry | null;
  partnerToday: MoodEntry | null;
  feedEntries: MoodEntry[];
  todayKey: string;
  loading: boolean;
  feedExhausted: boolean;
  init: (coupleId: string, myUid: string, partnerUid: string) => () => void;
  loadMoreFeed: (coupleId: string) => Promise<void>;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  myToday: null,
  partnerToday: null,
  feedEntries: [],
  todayKey: localDayKey(),
  loading: true,
  feedExhausted: false,

  init(coupleId, myUid, partnerUid) {
    const dayKey = localDayKey();
    set({ todayKey: dayKey, loading: true, feedExhausted: false });

    const unsubMy = subscribeToMoodEntry(coupleId, myUid, dayKey, (e) =>
      set({ myToday: e }),
    );
    const unsubPartner = subscribeToMoodEntry(coupleId, partnerUid, dayKey, (e) =>
      set({ partnerToday: e }),
    );
    const unsubFeed = subscribeToCoupleMoodFeed(coupleId, FEED_PAGE_SIZE, (entries) =>
      set({ feedEntries: entries, loading: false }),
    );

    let rolloverTimer: ReturnType<typeof setInterval> | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

    const checkRollover = () => {
      const newKey = localDayKey();
      if (newKey !== get().todayKey) {
        set({ todayKey: newKey, myToday: null, partnerToday: null, loading: true });
        cleanup();
        get().init(coupleId, myUid, partnerUid);
      }
    };

    rolloverTimer = setInterval(checkRollover, 60_000);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') checkRollover();
    };
    appStateSubscription = AppState.addEventListener('change', handleAppState);

    const cleanup = () => {
      unsubMy();
      unsubPartner();
      unsubFeed();
      if (rolloverTimer) clearInterval(rolloverTimer);
      if (appStateSubscription) appStateSubscription.remove();
    };

    return cleanup;
  },

  async loadMoreFeed(coupleId) {
    const { feedEntries, feedExhausted } = get();
    if (feedExhausted || feedEntries.length === 0) return;

    const oldestDayKey = feedEntries[feedEntries.length - 1]!.dayKey;
    const older = await paginateCoupleMood(coupleId, oldestDayKey, FEED_PAGE_SIZE);
    if (older.length < FEED_PAGE_SIZE) {
      set({ feedExhausted: true });
    }
    if (older.length > 0) {
      set({ feedEntries: [...feedEntries, ...older] });
    }
  },
}));
