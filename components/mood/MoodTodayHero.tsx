import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';
import type { MoodEntry } from '@/types';

type Props = {
  myEntry: MoodEntry | null;
  partnerEntry: MoodEntry | null;
  myLabel: string;
  partnerLabel: string;
  onPressMine: () => void;
};

/** Today — one soft card; emoji floats (no nested trays). Split reads by column only. */
export function MoodTodayHero({
  myEntry,
  partnerEntry,
  myLabel,
  partnerLabel,
  onPressMine,
}: Props) {
  return (
    <View
      className="flex-row overflow-hidden rounded-[28px] border border-hum-border/18 bg-hum-card"
      style={cardShadow}
    >
      <Pressable
        onPress={onPressMine}
        accessibilityRole="button"
        accessibilityLabel={
          myEntry ? `your mood: ${myEntry.current.label}. tap to change.` : 'log your mood'
        }
        className="flex-1 border-r border-hum-border/10 px-4 py-5 active:opacity-88"
      >
        <Text
          className="mb-4 text-[11px] font-medium capitalize tracking-wide text-hum-dim"
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {myLabel}
        </Text>
        {myEntry ? (
          <View className="items-center gap-y-2">
            <Text className="text-[52px] leading-[56px]" allowFontScaling={false}>
              {myEntry.current.emoji}
            </Text>
            <Text
              className="text-center text-[14px] font-medium leading-[19px] tracking-tight text-hum-text"
              numberOfLines={1}
              maxFontSizeMultiplier={1.25}
            >
              {myEntry.current.label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.dim} style={styles.chevron} />
          </View>
        ) : (
          <View className="min-h-[132px] items-center justify-center py-2">
            <View className="h-[54px] w-[54px] items-center justify-center rounded-full border border-dashed border-hum-border/30 bg-hum-bg/25">
              <Ionicons name="add" size={28} color={theme.dim} />
            </View>
          </View>
        )}
      </Pressable>

      <View className="flex-1 px-4 py-5">
        <Text
          className="mb-4 text-[11px] font-medium capitalize tracking-wide text-hum-dim"
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
        >
          {partnerLabel}
        </Text>
        {partnerEntry ? (
          <View className="items-center gap-y-2">
            <Text className="text-[52px] leading-[56px]" allowFontScaling={false}>
              {partnerEntry.current.emoji}
            </Text>
            <Text
              className="text-center text-[14px] font-medium leading-[19px] tracking-tight text-hum-text"
              numberOfLines={1}
              maxFontSizeMultiplier={1.25}
            >
              {partnerEntry.current.label}
            </Text>
          </View>
        ) : (
          <View className="min-h-[132px] items-center justify-center py-2 opacity-45">
            <Ionicons name="ellipse-outline" size={44} color={theme.dim} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chevron: { opacity: 0.45 },
});
