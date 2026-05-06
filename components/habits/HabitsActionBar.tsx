import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { HabitSegmentedControl } from './HabitSegmentedControl';
import { AnimatedNumber } from '@/components/shared/AnimatedNumber';
import type { HabitsView } from '@/lib/stores/habitStore';

type Props = {
  mode: HabitsView;
  onModeChange: (m: HabitsView) => void;
  doneCount: number;
  totalCount: number;
  jointStreak: number;
  onAddPress: () => void;
};

function AnimatedProgressBar({ pct, allDone }: { pct: number; allDone: boolean }) {
  // Use scaleX + native driver so the progress bar never competes with the
  // emoji shower for JS-thread time. The bar is full-width but scaled
  // horizontally from the left edge (transformOrigin left).
  const scale = useRef(new Animated.Value(pct)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const prevPct = useRef(pct);

  useEffect(() => {
    const growing = pct > prevPct.current;
    prevPct.current = pct;

    Animated.spring(scale, {
      toValue: Math.max(pct, 0.001),
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();

    if (growing && pct > 0) {
      glow.setValue(1);
      Animated.timing(glow, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();

      if (allDone) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [pct, allDone, scale, glow]);

  return (
    <View className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-hum-border/30">
      <Animated.View
        className="absolute inset-y-0 left-0 right-0 rounded-full"
        style={{
          backgroundColor: theme.primary,
          transform: [{ scaleX: scale }],
          // Scale from the left edge so 0 → 1 fills left-to-right.
          transformOrigin: 'left center',
        }}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: theme.primary,
          opacity: glow.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.35],
          }),
        }}
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
              allowFontScaling={false}
            />
            <Text
              className={`text-[11px] font-medium tabular-nums ${
                allDone ? 'text-hum-primary' : 'text-hum-dim'
              }`}
              allowFontScaling={false}
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
            allowFontScaling={false}
          />
        </View>
      ) : null}

      <Pressable
        onPress={onAddPress}
        accessibilityLabel="add habit"
        hitSlop={10}
        className="h-9 w-9 items-center justify-center rounded-full border border-hum-border/18 bg-hum-card/60"
      >
        <Ionicons name="add" size={20} color={theme.primary} />
      </Pressable>
    </View>
  );
}
