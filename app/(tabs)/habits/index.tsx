import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { useAuthStore } from '@/lib/stores/authStore';
import { useHabitStore } from '@/lib/stores/habitStore';
import { usePartnerName } from '@/lib/usePartnerName';
import { theme } from '@/constants/theme';
import { scrollContentStandard } from '@/constants/screenLayout';
import { InSyncCelebration } from '@/components/habits/InSyncCelebration';
import { localDayKey, localWeekKey } from '@/lib/dateKeys';
import {
  activeDailyHabits,
  activeWeeklyHabits,
  hasDailyCheckin,
  hasWeeklyCheckin,
  indexHabitCheckins,
  weeklyHabitIsActiveForWeek,
} from '@/lib/habitStreakLogic';
import type { Habit } from '@/types';
import { HabitsActionBar } from '@/components/habits/HabitsActionBar';
import { HabitCard } from '@/components/habits/HabitCard';
import { InlineAddHabitTile } from '@/components/habits/InlineAddHabitTile';
import { SectionLabel } from '@/components/habits/SectionLabel';
import { EditHabitSheet } from '@/components/habits/EditHabitSheet';
import { purgeLegacyHabitsIfNeeded } from '@/lib/firestore/habitsLegacyPurge';

function sortSharedDailyKeys(
  habits: Habit[],
  myUid: string,
  partnerId: string,
  dayKey: string,
  keys: Set<string>,
): Habit[] {
  const score = (h: Habit) => {
    const me = hasDailyCheckin(keys, h.id, myUid, dayKey);
    const them = partnerId ? hasDailyCheckin(keys, h.id, partnerId, dayKey) : false;
    const both = me && them;
    return (both ? 100 : 0) + (me ? 10 : 0);
  };
  return [...habits].sort((a, b) => score(a) - score(b));
}

function sortPersonalDaily(
  habits: Habit[],
  myUid: string,
  dayKey: string,
  keys: Set<string>,
): Habit[] {
  return [...habits].sort((a, b) => {
    const ca = hasDailyCheckin(keys, a.id, myUid, dayKey) ? 1 : 0;
    const cb = hasDailyCheckin(keys, b.id, myUid, dayKey) ? 1 : 0;
    return ca - cb;
  });
}

function sortSharedWeekly(
  habits: Habit[],
  myUid: string,
  partnerId: string,
  weekKey: string,
  keys: Set<string>,
): Habit[] {
  const score = (h: Habit) => {
    if (!weeklyHabitIsActiveForWeek(h, weekKey)) return 300;
    const me = hasWeeklyCheckin(keys, h.id, myUid, weekKey);
    const them = partnerId ? hasWeeklyCheckin(keys, h.id, partnerId, weekKey) : false;
    const both = me && them;
    return (both ? 100 : 0) + (me ? 10 : 0);
  };
  return [...habits].sort((a, b) => score(a) - score(b));
}

function sortPersonalWeekly(
  habits: Habit[],
  myUid: string,
  weekKey: string,
  keys: Set<string>,
): Habit[] {
  return [...habits].sort((a, b) => {
    const activeA = weeklyHabitIsActiveForWeek(a, weekKey);
    const activeB = weeklyHabitIsActiveForWeek(b, weekKey);
    if (activeA !== activeB) return activeA ? -1 : 1;
    const ca = hasWeeklyCheckin(keys, a.id, myUid, weekKey) ? 1 : 0;
    const cb = hasWeeklyCheckin(keys, b.id, myUid, weekKey) ? 1 : 0;
    return ca - cb;
  });
}

/** Keep list order stable across check-in updates; `stableIds` empty => use `sorted` as-is. */
function orderHabitsByStableIds(sorted: Habit[], stableIds: string[]): Habit[] {
  if (stableIds.length === 0) return sorted;
  const byId = new Map(sorted.map((h) => [h.id, h]));
  const seen = new Set<string>();
  const out: Habit[] = [];
  for (const id of stableIds) {
    const h = byId.get(id);
    if (h) {
      out.push(h);
      seen.add(id);
    }
  }
  for (const h of sorted) {
    if (!seen.has(h.id)) out.push(h);
  }
  return out;
}

function weekStartDisplay(weekMondayKey: string): string {
  const [y, m, d] = weekMondayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt
    .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    .toLowerCase();
}

export default function HabitsBoardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const partnerName = usePartnerName();
  const habits = useHabitStore((s) => s.habits);
  const todayDailyCheckins = useHabitStore((s) => s.todayDailyCheckins);
  const weekWeeklyCheckins = useHabitStore((s) => s.weekWeeklyCheckins);
  const couple = useHabitStore((s) => s.couple);
  const view = useHabitStore((s) => s.view);
  const setView = useHabitStore((s) => s.setView);
  const toggleDailyCheckin = useHabitStore((s) => s.toggleDailyCheckin);
  const toggleWeeklyCheckin = useHabitStore((s) => s.toggleWeeklyCheckin);

  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [purging, setPurging] = useState(false);
  const purgeLock = useRef(false);

  const myUid = profile?.uid ?? '';
  const coupleId = profile?.coupleId ?? '';
  const partnerId = profile?.partnerId ?? '';
  const myFirst = (profile?.displayName ?? 'you').split(' ')[0] ?? 'you';
  const partnerFirst = partnerName.split(' ')[0] ?? 'partner';

  const todayKey = localDayKey();
  const weekKey = localWeekKey();

  const checkinKeys = useMemo(
    () => indexHabitCheckins([...todayDailyCheckins, ...weekWeeklyCheckins]),
    [todayDailyCheckins, weekWeeklyCheckins],
  );

  const dailyShared = useMemo(
    () => activeDailyHabits(habits).filter((h) => h.scope === 'shared'),
    [habits],
  );
  const dailyPersonalMine = useMemo(
    () => activeDailyHabits(habits).filter((h) => h.scope === 'personal' && h.createdBy === myUid),
    [habits, myUid],
  );
  const weeklyShared = useMemo(
    () => activeWeeklyHabits(habits).filter((h) => h.scope === 'shared'),
    [habits],
  );
  const weeklyPersonalMine = useMemo(
    () => activeWeeklyHabits(habits).filter((h) => h.scope === 'personal' && h.createdBy === myUid),
    [habits, myUid],
  );

  const sortedDailyShared = useMemo(
    () => sortSharedDailyKeys(dailyShared, myUid, partnerId, todayKey, checkinKeys),
    [dailyShared, myUid, partnerId, todayKey, checkinKeys],
  );
  const sortedDailyPersonal = useMemo(
    () => sortPersonalDaily(dailyPersonalMine, myUid, todayKey, checkinKeys),
    [dailyPersonalMine, myUid, todayKey, checkinKeys],
  );
  const sortedWeeklyShared = useMemo(
    () => sortSharedWeekly(weeklyShared, myUid, partnerId, weekKey, checkinKeys),
    [weeklyShared, myUid, partnerId, weekKey, checkinKeys],
  );
  const sortedWeeklyPersonal = useMemo(
    () => sortPersonalWeekly(weeklyPersonalMine, myUid, weekKey, checkinKeys),
    [weeklyPersonalMine, myUid, weekKey, checkinKeys],
  );

  const latestSortedRef = useRef({
    sortedDailyShared,
    sortedDailyPersonal,
    sortedWeeklyShared,
    sortedWeeklyPersonal,
  });
  latestSortedRef.current = {
    sortedDailyShared,
    sortedDailyPersonal,
    sortedWeeklyShared,
    sortedWeeklyPersonal,
  };

  const stableDailySharedIds = useRef<string[]>([]);
  const stableDailyPersonalIds = useRef<string[]>([]);
  const stableWeeklySharedIds = useRef<string[]>([]);
  const stableWeeklyPersonalIds = useRef<string[]>([]);
  const [orderTick, setOrderTick] = useState(0);
  const bumpOrder = useCallback(() => setOrderTick((t) => t + 1), []);

  const applyStableFromLatest = useCallback(
    (which: 'daily' | 'weekly' | 'all') => {
      const l = latestSortedRef.current;
      if (which === 'daily' || which === 'all') {
        stableDailySharedIds.current = l.sortedDailyShared.map((h) => h.id);
        stableDailyPersonalIds.current = l.sortedDailyPersonal.map((h) => h.id);
      }
      if (which === 'weekly' || which === 'all') {
        stableWeeklySharedIds.current = l.sortedWeeklyShared.map((h) => h.id);
        stableWeeklyPersonalIds.current = l.sortedWeeklyPersonal.map((h) => h.id);
      }
      bumpOrder();
    },
    [bumpOrder],
  );

  const prevListViewRef = useRef(view);
  useEffect(() => {
    const prev = prevListViewRef.current;
    if (prev === view) return;
    prevListViewRef.current = view;
    applyStableFromLatest(view === 'daily' ? 'daily' : 'weekly');
  }, [view, applyStableFromLatest]);

  const displayDailyShared = useMemo(
    () => orderHabitsByStableIds(sortedDailyShared, stableDailySharedIds.current),
    [sortedDailyShared, orderTick],
  );
  const displayDailyPersonal = useMemo(
    () => orderHabitsByStableIds(sortedDailyPersonal, stableDailyPersonalIds.current),
    [sortedDailyPersonal, orderTick],
  );
  const displayWeeklyShared = useMemo(
    () => orderHabitsByStableIds(sortedWeeklyShared, stableWeeklySharedIds.current),
    [sortedWeeklyShared, orderTick],
  );
  const displayWeeklyPersonal = useMemo(
    () => orderHabitsByStableIds(sortedWeeklyPersonal, stableWeeklyPersonalIds.current),
    [sortedWeeklyPersonal, orderTick],
  );

  const sharedDailyDone = useMemo(
    () =>
      dailyShared.reduce((acc, h) => {
        const me = hasDailyCheckin(checkinKeys, h.id, myUid, todayKey);
        const them = partnerId ? hasDailyCheckin(checkinKeys, h.id, partnerId, todayKey) : false;
        return acc + (me && them ? 1 : 0);
      }, 0),
    [dailyShared, checkinKeys, myUid, partnerId, todayKey],
  );

  const sharedWeeklyActive = useMemo(
    () => weeklyShared.filter((h) => weeklyHabitIsActiveForWeek(h, weekKey)),
    [weeklyShared, weekKey],
  );
  const sharedWeeklyDone = useMemo(
    () =>
      sharedWeeklyActive.reduce((acc, h) => {
        const me = hasWeeklyCheckin(checkinKeys, h.id, myUid, weekKey);
        const them = partnerId ? hasWeeklyCheckin(checkinKeys, h.id, partnerId, weekKey) : false;
        return acc + (me && them ? 1 : 0);
      }, 0),
    [sharedWeeklyActive, checkinKeys, myUid, partnerId, weekKey],
  );

  const jointStreak = couple?.jointDailyStreak ?? 0;

  const heroTotal = view === 'daily' ? dailyShared.length : sharedWeeklyActive.length;
  const heroDone = view === 'daily' ? sharedDailyDone : sharedWeeklyDone;
  const allSharedDone = heroTotal > 0 && heroDone === heroTotal;

  const [celebrating, setCelebrating] = useState(false);
  const prevAllDone = useRef(allSharedDone);
  const prevView = useRef(view);

  useEffect(() => {
    const viewChanged = view !== prevView.current;
    prevView.current = view;

    if (viewChanged) {
      prevAllDone.current = allSharedDone;
      return;
    }
    if (allSharedDone && !prevAllDone.current) {
      setCelebrating(true);
    }
    prevAllDone.current = allSharedDone;
  }, [allSharedDone, view]);

  const onCelebrationFinished = useCallback(() => setCelebrating(false), []);

  const sharedListThisView = view === 'daily' ? displayDailyShared : displayWeeklyShared;
  const personalListThisView = view === 'daily' ? displayDailyPersonal : displayWeeklyPersonal;
  const noHabitsInView =
    sharedListThisView.length === 0 && personalListThisView.length === 0;

  useEffect(() => {
    if (!coupleId) return;
    return useHabitStore.getState().init(coupleId);
  }, [coupleId]);

  const tryPurge = useCallback(async () => {
    if (!coupleId) return;
    const c = useHabitStore.getState().couple;
    if (!c || c.habitsModelVersion === 2) return;
    if (purgeLock.current) return;
    purgeLock.current = true;
    setPurging(true);
    try {
      await purgeLegacyHabitsIfNeeded(coupleId);
    } catch (e) {
      console.warn('[habits] purgeLegacyHabitsIfNeeded', e);
    } finally {
      purgeLock.current = false;
      setPurging(false);
    }
  }, [coupleId]);

  useFocusEffect(
    useCallback(() => {
      applyStableFromLatest('all');
      void tryPurge();
    }, [tryPurge, applyStableFromLatest]),
  );

  useEffect(() => {
    void tryPurge();
  }, [tryPurge, couple?.habitsModelVersion]);

  if (!coupleId) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStandard}
          showsVerticalScrollIndicator={false}
        >
          <ScreenTitle
            title="habits"
            subtitle="link with your partner to share a habits board."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      {purging ? (
        <View className="absolute inset-0 z-50 items-center justify-center bg-hum-bg/70">
          <ActivityIndicator size="large" color={theme.secondary} />
          <Text className="mt-3 text-[13px] text-hum-muted">updating habits…</Text>
        </View>
      ) : null}

      <InSyncCelebration visible={celebrating} onFinished={onCelebrationFinished} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="habits" subtitle="small wins, same rhythm" />

        <HabitsActionBar
          mode={view}
          onModeChange={setView}
          doneCount={heroDone}
          totalCount={heroTotal}
          jointStreak={jointStreak}
          onAddPress={() => router.push('/habits/new')}
        />

        {view === 'daily' ? (
          <>
            {displayDailyShared.length > 0 ? (
              <View className="gap-y-2.5">
                <SectionLabel title="together" />
                {displayDailyShared.map((h) => (
                  <HabitCard
                    key={h.id}
                    variant="shared-daily"
                    emoji={h.emoji}
                    title={h.title}
                    myLabel={myFirst}
                    partnerLabel={partnerFirst}
                    myChecked={hasDailyCheckin(checkinKeys, h.id, myUid, todayKey)}
                    partnerChecked={
                      !!partnerId && hasDailyCheckin(checkinKeys, h.id, partnerId, todayKey)
                    }
                    onToggleMine={() => void toggleDailyCheckin(h.id, coupleId, myUid)}
                    onEditPress={() => setEditHabit(h)}
                  />
                ))}
              </View>
            ) : null}

            {displayDailyPersonal.length > 0 ? (
              <View className="gap-y-2.5">
                <SectionLabel title="just you" />
                {displayDailyPersonal.map((h) => (
                  <HabitCard
                    key={h.id}
                    variant="personal-daily"
                    emoji={h.emoji}
                    title={h.title}
                    myLabel={myFirst}
                    myChecked={hasDailyCheckin(checkinKeys, h.id, myUid, todayKey)}
                    onToggleMine={() => void toggleDailyCheckin(h.id, coupleId, myUid)}
                    onEditPress={() => setEditHabit(h)}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <>
            {displayWeeklyShared.length > 0 ? (
              <View className="gap-y-2.5">
                <SectionLabel title="together" />
                {displayWeeklyShared.map((h) => {
                  const active = weeklyHabitIsActiveForWeek(h, weekKey);
                  const starts =
                    !active && h.weeklyStartWeekKey
                      ? weekStartDisplay(h.weeklyStartWeekKey)
                      : undefined;
                  return (
                    <HabitCard
                      key={h.id}
                      variant="shared-weekly"
                      emoji={h.emoji}
                      title={h.title}
                      myLabel={myFirst}
                      partnerLabel={partnerFirst}
                      myChecked={hasWeeklyCheckin(checkinKeys, h.id, myUid, weekKey)}
                      partnerChecked={
                        !!partnerId && hasWeeklyCheckin(checkinKeys, h.id, partnerId, weekKey)
                      }
                      inactive={!active}
                      startsLabel={starts}
                      onToggleMine={() => void toggleWeeklyCheckin(h.id, coupleId, myUid)}
                      onEditPress={() => setEditHabit(h)}
                    />
                  );
                })}
              </View>
            ) : null}

            {displayWeeklyPersonal.length > 0 ? (
              <View className="gap-y-2.5">
                <SectionLabel title="just you" />
                {displayWeeklyPersonal.map((h) => {
                  const active = weeklyHabitIsActiveForWeek(h, weekKey);
                  const starts =
                    !active && h.weeklyStartWeekKey
                      ? weekStartDisplay(h.weeklyStartWeekKey)
                      : undefined;
                  return (
                    <HabitCard
                      key={h.id}
                      variant="personal-weekly"
                      emoji={h.emoji}
                      title={h.title}
                      myLabel={myFirst}
                      myChecked={hasWeeklyCheckin(checkinKeys, h.id, myUid, weekKey)}
                      inactive={!active}
                      startsLabel={starts}
                      onToggleMine={() => void toggleWeeklyCheckin(h.id, coupleId, myUid)}
                      onEditPress={() => setEditHabit(h)}
                    />
                  );
                })}
              </View>
            ) : null}
          </>
        )}

        {noHabitsInView ? (
          <View className="items-center gap-y-2 py-8">
            <Text className="text-[28px]" allowFontScaling={false}>
              ✨
            </Text>
            <Text className="text-[14px] font-light text-hum-muted">
              {view === 'daily' ? 'no daily habits yet.' : 'no weekly habits yet.'}
            </Text>
          </View>
        ) : null}

        <InlineAddHabitTile onPress={() => router.push('/habits/new')} />
      </ScrollView>

      <EditHabitSheet visible={!!editHabit} habit={editHabit} onClose={() => setEditHabit(null)} />
    </SafeAreaView>
  );
}
