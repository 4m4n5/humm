import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMoodStore } from '@/lib/stores/moodStore';
import { usePartnerName } from '@/lib/usePartnerName';
import { promptPushPermissionOnce } from '@/lib/pushPermission';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { MoodTodayHero } from '@/components/mood/MoodTodayHero';
import { WeekStrip } from '@/components/mood/WeekStrip';
import { IntradayTrail } from '@/components/mood/IntradayTrail';
import { MoodMirrorMoment } from '@/components/mood/MoodMirrorMoment';
import { SectionLabel } from '@/components/habits/SectionLabel';
import { scrollContentStandard } from '@/constants/screenLayout';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';
import { localDayKey } from '@/lib/dateKeys';
import type { MoodEntry } from '@/types';

type MergedDayRow = {
  dayKey: string;
  my: MoodEntry | null;
  partner: MoodEntry | null;
};

function mergeFeedRows(entries: MoodEntry[], myUid: string): MergedDayRow[] {
  const byDay = new Map<string, { my: MoodEntry | null; partner: MoodEntry | null }>();
  for (const e of entries) {
    const existing = byDay.get(e.dayKey) ?? { my: null, partner: null };
    if (e.uid === myUid) existing.my = e;
    else existing.partner = e;
    byDay.set(e.dayKey, existing);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, { my, partner }]) => ({ dayKey, my, partner }));
}

function formatDayLabel(dayKey: string): string {
  const today = localDayKey();
  if (dayKey === today) return 'today';
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return 'yesterday';
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
}

export default function MoodScreen() {
  const profile = useAuthStore((s) => s.profile);
  const partnerName = usePartnerName();
  const { myToday, partnerToday, feedEntries, loading, init } = useMoodStore();

  const coupleId = profile?.coupleId ?? '';
  const myUid = profile?.uid ?? '';
  const partnerId = profile?.partnerId ?? '';
  const myFirst = (profile?.displayName ?? 'you').split(' ')[0] ?? 'you';
  const partnerFirst = partnerName.split(' ')[0] ?? 'partner';
  const partnerLinked = !!partnerId && !!coupleId;

  useEffect(() => {
    if (!coupleId || !myUid || !partnerId) return;
    return init(coupleId, myUid, partnerId);
  }, [coupleId, myUid, partnerId, init]);

  const pushPrompted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (partnerLinked && myUid && !pushPrompted.current) {
        pushPrompted.current = true;
        void promptPushPermissionOnce(myUid);
      }
    }, [partnerLinked, myUid]),
  );

  const myEntries = useMemo(
    () => feedEntries.filter((e) => e.uid === myUid),
    [feedEntries, myUid],
  );
  const partnerEntries = useMemo(
    () => feedEntries.filter((e) => e.uid !== myUid),
    [feedEntries, myUid],
  );

  const mergedRows = useMemo(
    () => mergeFeedRows(feedEntries, myUid),
    [feedEntries, myUid],
  );

  if (!partnerLinked) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStandard}
          showsVerticalScrollIndicator={false}
        >
          <ScreenTitle title="mood" subtitle="link partner from profile" />
          <View
            className="items-center gap-y-3 rounded-[28px] border border-hum-border/18 bg-hum-card px-6 py-8"
            style={cardShadow}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-hum-petal/[0.10]">
              <Ionicons name="heart-half-outline" size={24} color={theme.petal} />
            </View>
            <Text
              className="text-center text-[14px] font-light leading-[21px] text-hum-muted"
              maxFontSizeMultiplier={1.3}
            >
              mood unlocks when you're paired.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <MoodMirrorMoment myEntry={myToday} partnerEntry={partnerToday} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="mood" subtitle="quick check-in" />

        <MoodTodayHero
          myEntry={myToday}
          partnerEntry={partnerToday}
          myLabel={myFirst}
          partnerLabel={partnerFirst}
          onPressMine={() => router.push('/mood/log')}
        />

        <WeekStrip myEntries={myEntries} partnerEntries={partnerEntries} />

        {mergedRows.length > 0 ? (
          <View className="gap-y-2.5">
            <SectionLabel title="history" />
            {mergedRows.map((row) => (
              <DayCard key={row.dayKey} row={row} myLabel={myFirst} partnerLabel={partnerFirst} />
            ))}
          </View>
        ) : !loading ? (
          <View
            className="items-center rounded-[28px] border border-hum-border/18 bg-hum-card py-12"
            style={cardShadow}
          >
            <Text className="text-[32px] opacity-40" allowFontScaling={false}>
              💭
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DayCard({
  row,
  myLabel,
  partnerLabel,
}: {
  row: MergedDayRow;
  myLabel: string;
  partnerLabel: string;
}) {
  const inSync =
    !!row.my &&
    !!row.partner &&
    row.my.current.stickerId === row.partner.current.stickerId;

  return (
    <View
      className="gap-y-3 rounded-[28px] border border-hum-border/18 bg-hum-card px-4 py-4"
      style={cardShadow}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.26em] text-hum-dim"
          maxFontSizeMultiplier={1.15}
        >
          {formatDayLabel(row.dayKey)}
        </Text>
        {inSync ? (
          <Ionicons name="link" size={14} color={theme.gold} accessibilityLabel="same mood" />
        ) : null}
      </View>

      {row.my ? (
        <View className="flex-row items-center gap-x-3">
          <Text className="w-[52px] text-[11px] font-medium capitalize text-hum-dim" numberOfLines={1}>
            {myLabel}
          </Text>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-hum-surface/35">
            <Text className="text-[22px]" allowFontScaling={false}>
              {row.my.current.emoji}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="text-[13px] font-medium leading-[18px] tracking-tight text-hum-text"
              numberOfLines={1}
            >
              {row.my.current.label}
            </Text>
            <IntradayTrail timeline={row.my.timeline} ownerLabel={myLabel} />
          </View>
        </View>
      ) : null}

      {row.partner ? (
        <View className="flex-row items-center gap-x-3">
          <Text className="w-[52px] text-[11px] font-medium capitalize text-hum-dim" numberOfLines={1}>
            {partnerLabel}
          </Text>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-hum-surface/35">
            <Text className="text-[22px]" allowFontScaling={false}>
              {row.partner.current.emoji}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="text-[13px] font-medium leading-[18px] tracking-tight text-hum-text"
              numberOfLines={1}
            >
              {row.partner.current.label}
            </Text>
            <IntradayTrail timeline={row.partner.timeline} ownerLabel={partnerLabel} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
