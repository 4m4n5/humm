import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MoodTimelinePoint } from '@/types';
import { relativeMoodTime } from '@/lib/relativeMoodTime';

const VISIBLE_CAP = 6;

type Props = {
  timeline: MoodTimelinePoint[];
  ownerLabel: string;
};

export function IntradayTrail({ timeline, ownerLabel }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (timeline.length <= 1) return null;

  const display = timeline.length > VISIBLE_CAP
    ? timeline.slice(timeline.length - VISIBLE_CAP)
    : timeline;
  const hidden = timeline.length - display.length;

  return (
    <>
      <Pressable
        className="flex-row items-center gap-x-1.5"
        onPress={() => setExpanded(true)}
        accessibilityLabel={`${timeline.length} mood updates today by ${ownerLabel}`}
        accessibilityRole="button"
      >
        {hidden > 0 && (
          <Text className="text-[10px] font-light text-hum-dim">+{hidden}</Text>
        )}
        {display.map((p, i) => (
          <View
            key={i}
            className="h-5 w-5 items-center justify-center rounded-full bg-hum-surface/40"
          >
            <Text className="text-[10px]" allowFontScaling={false}>{p.emoji}</Text>
          </View>
        ))}
      </Pressable>

      <Modal visible={expanded} animationType="slide" transparent>
        <SafeAreaView className="flex-1 bg-hum-bg/95">
          <View className="flex-row items-center justify-between border-b border-hum-border/15 px-5 py-4">
            <Text className="text-[15px] font-semibold text-hum-text">
              {ownerLabel}&apos;s day
            </Text>
            <Pressable onPress={() => setExpanded(false)} hitSlop={12}>
              <Text className="text-[13px] font-medium text-hum-primary">close</Text>
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {[...timeline].reverse().map((p, i) => (
              <View key={i} className="flex-row items-center gap-x-3 border-b border-hum-border/10 py-3">
                <Text className="text-[24px]" allowFontScaling={false}>{p.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-[14px] font-medium text-hum-text">{p.label}</Text>
                  <Text className="text-[11px] font-light text-hum-dim">
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
