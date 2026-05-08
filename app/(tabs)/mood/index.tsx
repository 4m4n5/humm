import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMoodStore } from '@/lib/stores/moodStore';
import { usePartnerName } from '@/lib/usePartnerName';
import { promptPushPermissionOnce } from '@/lib/pushPermission';
import { ScreenTitle } from '@/components/shared/ScreenTitle';
import { EmptyState } from '@/components/shared/EmptyState';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { MoodTodayHero } from '@/components/mood/MoodTodayHero';
import { WeekStrip } from '@/components/mood/WeekStrip';
import { IntradayTrail } from '@/components/mood/IntradayTrail';
import { AmbientGlow } from '@/components/shared/AmbientGlow';
import { scrollContentStandard } from '@/constants/screenLayout';
import { cardShadow } from '@/constants/elevation';
import { theme } from '@/constants/theme';
import { localDayKey } from '@/lib/dateKeys';
import type { MoodEntry } from '@/types';

const EARLIER_INITIAL_LIMIT = 5;

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
  return dt
    .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    .toLowerCase();
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

  const todayKey = localDayKey();
  const mergedRows = useMemo(
    () => mergeFeedRows(feedEntries, myUid).filter((r) => r.dayKey !== todayKey),
    [feedEntries, myUid, todayKey],
  );

  const [earlierExpanded, setEarlierExpanded] = useState(false);
  const visibleEarlierRows = earlierExpanded
    ? mergedRows
    : mergedRows.slice(0, EARLIER_INITIAL_LIMIT);
  const hiddenEarlierCount = mergedRows.length - visibleEarlierRows.length;

  if (!partnerLinked) {
    return (
      <SafeAreaView className="flex-1 bg-hum-bg">
        <AmbientGlow tone="bloom" />
        <ScrollView
          className="flex-1"
          contentContainerStyle={scrollContentStandard}
          showsVerticalScrollIndicator={false}
        >
          <ScreenTitle
            title="mood"
          />
          <EmptyState
            className="px-0"
            ionicon="people-outline"
            ioniconColor={`${theme.bloom}B3`}
            title="link your partner first"
            description="invite them · mood is for two"
            primaryAction={{ label: 'open profile', onPress: () => router.push('/profile') }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <AmbientGlow tone="bloom" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle title="mood" />

        <View className="gap-y-2.5">
          <SectionLabel title="today" />
          <MoodTodayHero
            myEntry={myToday}
            partnerEntry={partnerToday}
            myLabel={myFirst}
            partnerLabel={partnerFirst}
            onPressMine={() => router.push('/mood/log')}
          />
        </View>

        <View className="gap-y-2.5">
          <SectionLabel title="this week" />
          <WeekStrip
            myEntries={myEntries}
            partnerEntries={partnerEntries}
            myLabel={myFirst}
            partnerLabel={partnerFirst}
          />
        </View>

        {mergedRows.length > 0 ? (
          <View className="gap-y-2.5">
            <SectionLabel title="earlier" />
            {visibleEarlierRows.map((row) => (
              <DayCard
                key={row.dayKey}
                row={row}
                myLabel={myFirst}
                partnerLabel={partnerFirst}
              />
            ))}
            {mergedRows.length > EARLIER_INITIAL_LIMIT ? (
              <ExpandToggle
                expanded={earlierExpanded}
                hiddenCount={hiddenEarlierCount}
                onPress={() => setEarlierExpanded((e) => !e)}
              />
            ) : null}
          </View>
        ) : !loading ? (
          <EmptyState
            className="px-0"
            ionicon="chatbubble-ellipses-outline"
            ioniconColor={`${theme.bloom}B3`}
            title="earlier check-ins show up here"
            description="your week builds as you both keep logging"
            primaryAction={{ label: 'log today', onPress: () => router.push('/mood/log') }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Quiet pill-button to expand / collapse the earlier list. Borrows the
 * `decide` history toggle's visual language (rounded pill, /30 border,
 * /90 card, chevron) so it sits naturally inside the section.
 */
function ExpandToggle({
  expanded,
  hiddenCount,
  onPress,
}: {
  expanded: boolean;
  hiddenCount: number;
  onPress: () => void;
}) {
  const label = expanded ? 'show less' : `show ${hiddenCount} more`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'collapse earlier mood check-ins' : `show ${hiddenCount} more mood check-ins`}
      className="mt-1 min-h-[44px] flex-row items-center justify-center gap-x-1.5 self-center rounded-full border border-hum-border/30 bg-hum-card/90 px-4 active:opacity-88"
    >
      <Text
        className="text-[12px] font-light tabular-nums text-hum-muted"
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={13}
        color={theme.dim}
        style={{ opacity: 0.5 }}
      />
    </Pressable>
  );
}

function MoodEntryRow({
  entry,
  label,
}: {
  entry: MoodEntry;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-x-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-hum-bg/55">
        <Text className="text-[20px]" allowFontScaling={false}>
          {entry.current.emoji}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-y-0.5">
        <View className="flex-row items-baseline gap-x-2">
          <Text
            className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {entry.current.label}
          </Text>
          <Text
            className="text-[11px] font-light lowercase text-hum-dim"
            numberOfLines={1}
            maxFontSizeMultiplier={1.25}
          >
            {label}
          </Text>
        </View>
        <IntradayTrail timeline={entry.timeline} ownerLabel={label} compact />
      </View>
    </View>
  );
}

/**
 * Right-side spine: a quiet metadata column with the day label, vertically
 * centred so it reads as a single tag for the whole card rather than attached
 * to either mood row. The in-sync state is now communicated by the card's
 * petal-tinted border alone — no inline text needed.
 */
function DaySpine({ dayLabel }: { dayLabel: string }) {
  return (
    <View className="items-end justify-center self-stretch pl-2">
      <Text
        className="text-[11px] font-light lowercase tracking-[-0.005em] tabular-nums text-hum-dim"
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
      >
        {dayLabel}
      </Text>
    </View>
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
      className={`overflow-hidden rounded-[22px] border bg-hum-card ${
        inSync ? 'border-hum-bloom/25' : 'border-hum-border/18'
      }`}
      style={cardShadow}
    >
      <View className="flex-row items-stretch px-4 py-3.5">
        <View className="min-w-0 flex-1 gap-y-2.5">
          {row.my && <MoodEntryRow entry={row.my} label={myLabel} />}
          {row.partner && <MoodEntryRow entry={row.partner} label={partnerLabel} />}
        </View>
        <DaySpine dayLabel={formatDayLabel(row.dayKey)} />
      </View>
    </View>
  );
}
