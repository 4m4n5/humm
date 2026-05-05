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
 * Subtle toast when both partners pick the same emoji within 5 minutes.
 * Rising-edge detection prevents re-firing on remount or stale data.
 */
export function MoodMirrorMoment({ myEntry, partnerEntry, onFinished }: Props) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
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
        translateY.setValue(0);
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setVisible(false);
            onFinished?.();
          }
        }, 2400);
        return;
      }
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1900),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 360, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -8, duration: 360, useNativeDriver: true }),
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
  }, [shouldFire, opacity, translateY, onFinished]);

  if (!visible || !myEntry) return null;

  return (
    <View
      className="absolute inset-x-0 top-0 z-50 items-center px-6 pt-[60px]"
      pointerEvents="none"
    >
      <Animated.View
        className="flex-row items-center gap-3 rounded-full border border-hum-secondary/45 bg-hum-card px-4 py-2.5"
        style={[cardShadow, { opacity, transform: [{ translateY }] }]}
      >
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-hum-secondary/22">
          <Text className="text-[18px]" allowFontScaling={false}>
            {myEntry.current.emoji}
          </Text>
        </View>
        <View className="gap-y-0.5">
          <Text
            className="text-[13px] font-medium tracking-tight text-hum-text"
            maxFontSizeMultiplier={1.2}
          >
            in sync
          </Text>
          <Text
            className="text-[11px] font-light text-hum-dim"
            maxFontSizeMultiplier={1.2}
          >
            same mood right now
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
