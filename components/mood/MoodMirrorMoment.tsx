import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View, Text } from 'react-native';
import type { MoodEntry } from '@/types';
import { cardShadow } from '@/constants/elevation';

type Props = {
  myEntry: MoodEntry | null;
  partnerEntry: MoodEntry | null;
  onFinished?: () => void;
};

/**
 * Subtle celebration when both partners pick the same emoji within 5 minutes.
 * Uses the same edge-detection pattern as InSyncCelebration so it does not
 * fire on remount, navigation, or stale data.
 */
export function MoodMirrorMoment({ myEntry, partnerEntry, onFinished }: Props) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const prevMatch = useRef<boolean | null>(null);

  const match =
    !!myEntry &&
    !!partnerEntry &&
    myEntry.current.stickerId === partnerEntry.current.stickerId;

  const within5 =
    match &&
    Math.abs(myEntry!.updatedAt.toMillis() - partnerEntry!.updatedAt.toMillis()) < 5 * 60_000;

  const shouldFire = match && within5;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (prevMatch.current === null) {
      prevMatch.current = shouldFire;
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    const risingEdge = shouldFire && !prevMatch.current;
    prevMatch.current = shouldFire;

    if (!risingEdge) {
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      setVisible(true);
      if (reduce) {
        opacity.setValue(1);
        scale.setValue(1);
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setVisible(false);
            onFinished?.();
          }
        }, 2600);
        return;
      }
      opacity.setValue(0);
      scale.setValue(0.94);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 7,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2100),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 520, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.94, duration: 520, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (!cancelled) {
          setVisible(false);
          onFinished?.();
        }
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [shouldFire, opacity, scale, onFinished]);

  if (!visible || !myEntry) return null;

  return (
    <View className="absolute inset-x-0 top-0 z-50 items-center px-6 pt-[72px]" pointerEvents="none">
      <Animated.View
        className="items-center gap-y-2 rounded-[28px] border border-hum-petal/28 bg-hum-card px-8 py-6"
        style={[cardShadow, { opacity, transform: [{ scale }] }]}
      >
        <Text className="text-[40px] leading-[44px]" allowFontScaling={false}>
          {myEntry.current.emoji}
          {myEntry.current.emoji}
        </Text>
        <Text className="text-[15px] font-medium tracking-tight text-hum-text">same mood</Text>
      </Animated.View>
    </View>
  );
}
