import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import {
  REDUCE_MOTION_NEVER,
  SPRING_RICH_REVEAL,
} from '@/lib/motion';

type Props = {
  /** Optional. Render an uppercase tracking eyebrow above the label. */
  eyebrow?: string;
  label: string;
  footnote?: React.ReactNode;
  /** Extra classes on the footnote wrapper text (e.g. max width) */
  footnoteClassName?: string;
  /** Optional. Re-runs the entrance when this key changes (e.g. tiebreaker reveals). */
  revealKey?: string | number;
};

// Calibrated 2026-05-07 — opacity follows the spring entrance so both
// channels finish at the same wall-clock moment (avoids a "label appears
// before the card has settled" artefact).
const ENTRANCE_DURATION_MS = 850;

const CARD_SHADOW = {
  shadowColor: theme.primary,
  shadowRadius: 16,
  shadowOpacity: 0.25,
  shadowOffset: { width: 0, height: 0 } as const,
  elevation: 4,
};

/**
 * Static, single-shot reveal for a saved pick. Fades + softly springs in.
 * Renders the same visual as PickRevealAnimated's landed state so the
 * transition from animated → static is seamless.
 */
export function PickReveal({
  eyebrow,
  label,
  footnote,
  footnoteClassName = 'max-w-[280px] text-center text-[13px] font-light leading-[19px] text-hum-muted',
  revealKey,
}: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    opacity.value = 0;
    scale.value = 0.94;
    opacity.value = withTiming(1, {
      duration: ENTRANCE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: REDUCE_MOTION_NEVER,
    });
    scale.value = withSpring(1, {
      ...SPRING_RICH_REVEAL,
      reduceMotion: REDUCE_MOTION_NEVER,
    });
  }, [revealKey, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle} className="w-full items-center gap-y-4">
      {eyebrow ? (
        <Text
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim"
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
        >
          {eyebrow}
        </Text>
      ) : null}
      <View
        style={CARD_SHADOW}
        className="w-full items-center rounded-[20px] border border-hum-primary/25 bg-hum-primary/7 px-6 py-7"
      >
        <Text
          className="text-center text-[28px] font-medium leading-tight text-hum-primary"
          numberOfLines={3}
          maxFontSizeMultiplier={1.08}
        >
          {label}
        </Text>
      </View>
      {footnote ? (
        <Text className={footnoteClassName} maxFontSizeMultiplier={1.35}>
          {footnote}
        </Text>
      ) : null}
    </Animated.View>
  );
}
