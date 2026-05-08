import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { HabitSegmentedControl } from './HabitSegmentedControl';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import type { HabitsView } from '@/lib/stores/habitStore';
import { REDUCE_MOTION_NEVER } from '@/lib/motion';

type Props = {
  mode: HabitsView;
  onModeChange: (m: HabitsView) => void;
  doneCount: number;
  totalCount: number;
  jointStreak: number;
  onAddPress: () => void;
};

function AnimatedProgressBar({ pct, allDone }: { pct: number; allDone: boolean }) {
  // scaleX + UI thread (Reanimated) so the progress bar never competes with
  // the emoji shower for JS-thread time. The bar is full-width but scaled
  // horizontally from the left edge (transformOrigin left).
  const scale = useSharedValue(pct);
  const glow = useSharedValue(0);
  const prevPct = useRef(pct);

  useEffect(() => {
    const growing = pct > prevPct.current;
    prevPct.current = pct;

    // Progress bars use timing (not spring) per M3 spec
    // (m3.material.io/components/progress-indicators) — springs cause
    // tiny overshoots that read as stutter when pct updates rapidly
    // (multiple habit checks in quick succession). Cancel any in-flight
    // animation before starting a new one so concurrent updates don't
    // compound.
    cancelAnimation(scale);
    scale.value = withTiming(Math.max(pct, 0.001), {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      reduceMotion: REDUCE_MOTION_NEVER,
    });

    if (growing && pct > 0) {
      glow.value = 1;
      glow.value = withTiming(0, {
        duration: 800,
        easing: Easing.out(Easing.quad),
      });

      if (allDone) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [pct, allDone, scale, glow]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.35]),
  }));

  return (
    <View className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-hum-border/30">
      <Animated.View
        className="absolute inset-y-0 left-0 right-0 rounded-full"
        style={[
          {
            backgroundColor: theme.primary,
            // Scale from the left edge so 0 → 1 fills left-to-right.
            transformOrigin: 'left center',
          },
          fillStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 rounded-full"
        style={[{ backgroundColor: theme.primary }, glowStyle]}
      />
    </View>
  );
}

export function HabitsActionBar({
  mode,
  onModeChange,
  doneCount,
  totalCount,
  jointStreak,
  onAddPress,
}: Props) {
  const hasProgress = totalCount > 0;
  const pct = hasProgress ? doneCount / totalCount : 0;
  const allDone = hasProgress && doneCount === totalCount;

  return (
    <View className="flex-row items-center gap-2.5">
      <HabitSegmentedControl value={mode} onChange={onModeChange} />

      {hasProgress ? (
        <View className="flex-1 flex-row items-center gap-2">
          <AnimatedProgressBar pct={pct} allDone={allDone} />
          <View className="flex-row items-baseline">
            <AnimatedNumber
              value={doneCount}
              duration={420}
              className={`text-[11px] font-medium tabular-nums ${
                allDone ? 'text-hum-primary' : 'text-hum-dim'
              }`}
              maxFontSizeMultiplier={1.25}
            />
            <Text
              className={`text-[11px] font-medium tabular-nums ${
                allDone ? 'text-hum-primary' : 'text-hum-dim'
              }`}
              maxFontSizeMultiplier={1.25}
            >
              /{totalCount}
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-1" />
      )}

      {jointStreak > 0 ? (
        <View className="flex-row items-center gap-1 rounded-full border border-hum-primary/20 bg-hum-primary/10 px-2.5 py-1">
          <Text className="text-[12px]" allowFontScaling={false}>
            🔥
          </Text>
          <AnimatedNumber
            value={jointStreak}
            duration={520}
            className="text-[12px] font-semibold tabular-nums text-hum-text"
            maxFontSizeMultiplier={1.25}
          />
        </View>
      ) : null}

      <Pressable
        onPress={onAddPress}
        accessibilityRole="button"
        accessibilityLabel="add new habit"
        hitSlop={10}
        className="h-11 w-11 items-center justify-center rounded-full border border-hum-border/18 bg-hum-card/60"
      >
        <Ionicons name="add" size={20} color={theme.primary} />
      </Pressable>
    </View>
  );
}
