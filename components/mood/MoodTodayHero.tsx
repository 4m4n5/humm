import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';
import { DayTrailSlot } from '@/components/mood/DayTrailSlot';
import { relativeMoodTime } from '@/lib/relativeMoodTime';
import type { MoodEntry } from '@/types';

type Props = {
  myEntry: MoodEntry | null;
  partnerEntry: MoodEntry | null;
  myLabel: string;
  partnerLabel: string;
  onPressMine: () => void;
};

function MoodRow({
  entry,
  label,
  onPress,
}: {
  entry: MoodEntry | null;
  label: string;
  onPress?: () => void;
}) {
  const pressable = !!onPress;
  const Wrapper = pressable ? Pressable : View;

  const lastAt = entry?.timeline[entry.timeline.length - 1]?.at?.toMillis?.();
  const lastAgo = lastAt ? relativeMoodTime(lastAt) : null;

  const anchor = entry ? (
    <View className="h-12 w-12 items-center justify-center rounded-xl bg-hum-bg/55">
      <Text className="text-[30px] leading-[34px]" allowFontScaling={false}>
        {entry.current.emoji}
      </Text>
    </View>
  ) : (
    <View
      className={`h-12 w-12 items-center justify-center rounded-xl border border-dashed ${
        pressable
          ? 'border-hum-bloom/45 bg-hum-bloom/[0.06]'
          : 'border-hum-border/30 bg-hum-bg/40'
      }`}
    >
      {pressable ? (
        <Ionicons name="add" size={20} color={theme.bloom} />
      ) : (
        <Text className="text-[16px] opacity-30" maxFontSizeMultiplier={1.25}>
          ✦
        </Text>
      )}
    </View>
  );

  const centerColumn = entry ? (
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
      {lastAgo ? (
        <Text
          className="text-[11px] font-light leading-[15px] tabular-nums text-hum-dim/70"
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
        >
          {lastAgo}
        </Text>
      ) : null}
    </View>
  ) : (
    <View className="min-w-0 flex-1 gap-y-0.5">
      <View className="flex-row items-baseline gap-x-2">
        <Text
          className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-muted/85"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {pressable ? 'log mood' : 'not yet'}
        </Text>
        <Text
          className="text-[11px] font-light lowercase text-hum-dim"
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
        >
          {label}
        </Text>
      </View>
      <Text
        className={`text-[11px] font-light leading-[15px] ${pressable ? 'text-hum-bloom/75' : 'text-hum-dim/55'}`}
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
      >
        {pressable ? 'tap to check in' : 'waiting on them'}
      </Text>
    </View>
  );

  return (
    <Wrapper
      {...(pressable
        ? {
            onPress,
            accessibilityRole: 'button' as const,
            accessibilityLabel: entry
              ? `your mood: ${entry.current.label}. tap to change.`
              : 'log your mood',
          }
        : {})}
      className={`flex-row items-center gap-x-3.5 px-4 py-3.5 ${pressable ? 'active:opacity-88' : ''}`}
    >
      {anchor}
      {centerColumn}
      <DayTrailSlot entry={entry} ownerLabel={label} />
    </Wrapper>
  );
}

export function MoodTodayHero({
  myEntry,
  partnerEntry,
  myLabel,
  partnerLabel,
  onPressMine,
}: Props) {
  const inSync =
    !!myEntry &&
    !!partnerEntry &&
    myEntry.current.stickerId === partnerEntry.current.stickerId;

  return (
    <View
      className={`overflow-hidden rounded-[22px] border bg-hum-card ${
        inSync ? 'border-hum-bloom/45' : 'border-hum-bloom/30'
      }`}
      style={cardShadow}
    >
      <MoodRow entry={myEntry} label={myLabel} onPress={onPressMine} />
      <View className="mx-4 h-px bg-hum-border/18" />
      <MoodRow entry={partnerEntry} label={partnerLabel} />
    </View>
  );
}
