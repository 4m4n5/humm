import React, { useEffect, useRef } from 'react';
import { Pressable, View, Animated, AccessibilityInfo } from 'react-native';
import { router } from 'expo-router';
import { MoodChip } from '@/components/mood/MoodChip';
import type { MoodEntry } from '@/types';

type Props = {
  myEntry: MoodEntry | null;
  partnerEntry: MoodEntry | null;
  myLabel: string;
  partnerLabel: string;
};

/** Home row — paired pills only (no extra wrapping card / boxes). */
export function MoodHomeRow({ myEntry, partnerEntry, myLabel, partnerLabel }: Props) {
  const partnerScale = useRef(new Animated.Value(1)).current;
  const prevPartnerUpdated = useRef<number | null>(null);

  useEffect(() => {
    if (!partnerEntry) return;
    const ts = partnerEntry.updatedAt.toMillis();
    const isRecent = Date.now() - ts < 60_000;
    const isNew = prevPartnerUpdated.current !== null && ts !== prevPartnerUpdated.current;
    prevPartnerUpdated.current = ts;

    if (isRecent && isNew) {
      AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (reduced) return;
        partnerScale.setValue(1.04);
        Animated.spring(partnerScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [partnerEntry?.updatedAt, partnerScale]);

  return (
    <View className="flex-row gap-2.5">
      <Pressable
        className="min-w-0 flex-1 active:opacity-88"
        onPress={() => router.push('/mood/log')}
        accessibilityRole="button"
        accessibilityLabel={myEntry ? `your mood: ${myEntry.current.label}. tap to change.` : 'log your mood'}
      >
        <MoodChip entry={myEntry} ownerLabel={myLabel} emptyLabel="log mood" size="sm" embedded />
      </Pressable>

      <Animated.View className="min-w-0 flex-1" style={{ transform: [{ scale: partnerScale }] }}>
        <MoodChip entry={partnerEntry} ownerLabel={partnerLabel} size="sm" embedded />
      </Animated.View>
    </View>
  );
}
