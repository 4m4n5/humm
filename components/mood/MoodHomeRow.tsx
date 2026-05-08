import React, { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { MoodChip } from '@/components/mood/MoodChip';
import type { MoodEntry } from '@/types';
import { SPRING_FAST_SPATIAL } from '@/lib/motion';

type Props = {
  myEntry: MoodEntry | null;
  partnerEntry: MoodEntry | null;
  myLabel: string;
  partnerLabel: string;
};

/** Home row — paired pills only (no extra wrapping card / boxes). */
export function MoodHomeRow({ myEntry, partnerEntry, myLabel, partnerLabel }: Props) {
  const partnerScale = useSharedValue(1);
  const prevPartnerUpdated = useRef<number | null>(null);
  // Partner pulse on update is large-ish (4% scale on a peer-attention surface);
  // respect the system reduce-motion flag rather than forcing it. HIG-aligned.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!partnerEntry) return;
    const ts = partnerEntry.updatedAt.toMillis();
    const isRecent = Date.now() - ts < 60_000;
    const isNew = prevPartnerUpdated.current !== null && ts !== prevPartnerUpdated.current;
    prevPartnerUpdated.current = ts;

    if (isRecent && isNew && !reduceMotion) {
      cancelAnimation(partnerScale);
      partnerScale.value = 1.04;
      partnerScale.value = withSpring(1, SPRING_FAST_SPATIAL);
    }
  }, [partnerEntry, partnerScale, reduceMotion]);

  const partnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: partnerScale.value }],
  }));

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

      <Animated.View className="min-w-0 flex-1" style={partnerStyle}>
        <MoodChip entry={partnerEntry} ownerLabel={partnerLabel} size="sm" embedded />
      </Animated.View>
    </View>
  );
}
