import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { MoodEntry } from '@/types';
import { relativeMoodTime } from '@/lib/relativeMoodTime';
import { theme } from '@/constants/theme';
import { cardShadow } from '@/constants/elevation';

const SLOT_COUNT = 4;
const CHIP_SIZE = 18;
const CHIP_GAP = 3;

type Props = {
  entry: MoodEntry | null;
  ownerLabel: string;
};

/**
 * Right-side day trail rendered next to the anchor emoji in MoodTodayHero.
 *
 * The anchor already shows the latest mood, so this slot only shows the
 * *other* (older) entries. Layout is always 4 fixed slots:
 *   - slot 1 (leftmost) = 2nd newest
 *   - slot 2            = 3rd newest
 *   - slot 3            = 4th newest
 *   - slot 4 (rightmost)= 5th newest (oldest, given the 5-per-day cap)
 *
 * Slots fill from the left so chronology can be read newest → oldest as
 * you scan rightward. Empty slots are dashed placeholder dots so the
 * column width is stable across all states (0–5 check-ins).
 */
export function DayTrailSlot({ entry, ownerLabel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const timeline = entry?.timeline ?? [];

  // The anchor in MoodTodayHero already renders the latest entry, so the
  // trail starts from the second-newest.
  const others = timeline.length > 0 ? timeline.slice(0, -1) : [];
  // newest-of-others first (leftmost slot)
  const filled = [...others.slice(-SLOT_COUNT)].reverse();
  const placeholderCount = Math.max(0, SLOT_COUNT - filled.length);

  const tappable = timeline.length > 1;

  const Wrapper: React.ComponentType<React.ComponentProps<typeof Pressable>> =
    tappable ? Pressable : (View as never);

  return (
    <>
      <Wrapper
        {...(tappable
          ? {
              onPress: () => setExpanded(true),
              accessibilityRole: 'button' as const,
              accessibilityLabel: `${timeline.length} mood updates today by ${ownerLabel}`,
              hitSlop: 8,
            }
          : {})}
        className="flex-row items-center"
        style={{ columnGap: CHIP_GAP }}
      >
        {filled.map((p, i) => (
          <View
            key={`f-${i}`}
            className="items-center justify-center rounded-[6px] bg-hum-bg/55"
            style={{ height: CHIP_SIZE, width: CHIP_SIZE }}
          >
            <Text style={{ fontSize: 10 }} allowFontScaling={false}>
              {p.emoji}
            </Text>
          </View>
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => {
          // Visually emphasise the next slot to fill so the eye knows the
          // direction the trail is growing in.
          const isNext = i === 0;
          return (
            <View
              key={`p-${i}`}
              className={`items-center justify-center rounded-[6px] border ${
                isNext
                  ? 'border-hum-border/30 bg-hum-bg/30'
                  : 'border-hum-border/18 bg-transparent'
              }`}
              style={{
                height: CHIP_SIZE,
                width: CHIP_SIZE,
                borderStyle: 'dashed',
              }}
            >
              <View
                className={`rounded-full ${
                  isNext ? 'bg-hum-dim/40' : 'bg-hum-dim/22'
                }`}
                style={{ height: 3, width: 3 }}
              />
            </View>
          );
        })}
      </Wrapper>

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
