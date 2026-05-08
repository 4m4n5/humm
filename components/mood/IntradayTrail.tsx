import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MoodTimelinePoint } from '@/types';
import { relativeMoodTime } from '@/lib/relativeMoodTime';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';

const VISIBLE_CAP_DEFAULT = 6;
const VISIBLE_CAP_COMPACT = 4;

type Props = {
  timeline: MoodTimelinePoint[];
  ownerLabel: string;
  compact?: boolean;
};

export function IntradayTrail({ timeline, ownerLabel, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (timeline.length <= 1) return null;

  const cap = compact ? VISIBLE_CAP_COMPACT : VISIBLE_CAP_DEFAULT;
  const sliced =
    timeline.length > cap ? timeline.slice(timeline.length - cap) : timeline;
  // compact: newest on the left → reverse so most recent reads first.
  const display = compact ? [...sliced].reverse() : sliced;
  const hidden = timeline.length - sliced.length;

  const chipSize = compact ? 18 : 20;
  const emojiSize = compact ? 10 : 11;
  const radius = compact ? 'rounded-[6px]' : 'rounded-md';
  const chipGap = compact ? 'gap-x-[3px]' : 'gap-x-1';
  const chipClasses = 'bg-hum-bg/55';

  return (
    <>
      <Pressable
        className={`flex-row items-center ${chipGap} ${compact ? '' : 'pt-1'}`}
        onPress={() => setExpanded(true)}
        accessibilityLabel={`${timeline.length} mood updates today by ${ownerLabel}`}
        accessibilityRole="button"
        hitSlop={compact ? 8 : undefined}
      >
        {hidden > 0 && !compact && (
          <Text className="mr-0.5 text-[10px] font-light tabular-nums text-hum-dim/55" maxFontSizeMultiplier={1.25}>
            +{hidden}
          </Text>
        )}
        {display.map((p, i) => (
          <View
            key={i}
            className={`items-center justify-center ${chipClasses} ${radius}`}
            style={{ height: chipSize, width: chipSize }}
          >
            <Text style={{ fontSize: emojiSize }} allowFontScaling={false}>
              {p.emoji}
            </Text>
          </View>
        ))}
        {hidden > 0 && compact && (
          <Text className="ml-0.5 text-[10px] font-light tabular-nums text-hum-dim/55" maxFontSizeMultiplier={1.25}>
            +{hidden}
          </Text>
        )}
        {!compact ? (
          <Ionicons
            name="chevron-forward"
            size={10}
            color={theme.dim}
            style={{ opacity: 0.4, marginLeft: 2 }}
          />
        ) : null}
      </Pressable>

      <Modal visible={expanded} animationType="slide" transparent>
        <SafeAreaView className="flex-1 bg-hum-bg">
          <View className="flex-row items-start justify-between gap-3 px-6 pb-6 pt-5">
            <View className="min-w-0 flex-1 gap-y-2">
              <Text
                className="text-[26px] font-extralight leading-[32px] tracking-[-0.02em] text-hum-text"
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
              >
                {ownerLabel}&apos;s day
              </Text>
              <Text
                className="text-[14px] font-light leading-[20px] text-hum-muted"
                maxFontSizeMultiplier={1.3}
              >
                {timeline.length} check-in{timeline.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => setExpanded(false)}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel={`close ${ownerLabel}'s mood history`}
              className="h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hum-border/18 bg-hum-card/90 active:opacity-88"
            >
              <Ionicons name="close" size={18} color={theme.text} style={{ opacity: 0.85 }} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ gap: 8, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {[...timeline].reverse().map((p, i) => (
              <View
                key={i}
                className={`flex-row items-center gap-3 rounded-[22px] border bg-hum-card px-3.5 py-3 ${
                  i === 0 ? 'border-hum-bloom/40' : 'border-hum-border/18'
                }`}
                style={i === 0 ? cardShadow : undefined}
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl ${
                    i === 0 ? 'bg-hum-bloom/18' : 'bg-hum-bg/55'
                  }`}
                >
                  <Text className="text-[20px]" allowFontScaling={false}>
                    {p.emoji}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[15px] font-medium leading-[20px] tracking-tight text-hum-text"
                    maxFontSizeMultiplier={1.25}
                  >
                    {p.label}
                  </Text>
                  <Text
                    className="text-[11px] font-light text-hum-dim"
                    maxFontSizeMultiplier={1.3}
                  >
                    {relativeMoodTime(p.at.toMillis())}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
